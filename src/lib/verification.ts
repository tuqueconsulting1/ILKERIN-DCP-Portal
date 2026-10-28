import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadWorkdriveFile } from "@/lib/zoho";

/**
 * Automated document verification: downloads a queued WorkDrive file and has
 * Claude read it against the case's open checklist items. The result is a
 * suggestion stored on the pending_uploads row - a case manager accepts or
 * overrides it from the case page, so nothing reaches CBK unchecked.
 *
 * Off unless DOCUMENT_VERIFICATION_ENABLED=true *and* ANTHROPIC_API_KEY is
 * set, so adding the key alone never starts spending.
 */
export function isVerificationEnabled() {
  return process.env.DOCUMENT_VERIFICATION_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY);
}

const MODEL = "claude-opus-5-5";
// Request limit is 32MB including base64 overhead (~4/3).
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_FILES_PER_RUN = 10;
const CONCURRENCY = 3;

const IMAGE_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const Check = z.object({
  result: z.enum(["pass", "fail", "unclear", "not_applicable"]),
  note: z.string(),
});

const Review = z.object({
  // 1-based number from the checklist list in the prompt; null if none fits
  matched_item_number: z.number().int().nullable(),
  checks: z.object({
    right_document: Check,
    signed_and_complete: Check,
    in_date: Check,
    names_match: Check,
  }),
  // YYYY-MM-DD, only when the document states one
  expiry_date: z.string().nullable(),
  recommendation: z.enum(["verify", "reject", "unsure"]),
  summary: z.string(),
});

export type AiChecks = z.infer<typeof Review>["checks"];

const SYSTEM_PROMPT = `You review documents that a licensing consultancy collects from clients applying to the Central Bank of Kenya (CBK) for a Non-Deposit Taking Credit Provider (NDTCP) licence. A case manager reads your review before deciding, so be precise and say when you are unsure rather than guessing.

You are given one file from the client's folder, the client's company name, and the checklist items still outstanding for the case. Do four checks:

1. right_document - Which checklist item is this file? Judge by its content, not its file name. If it fits none, set matched_item_number to null and fail this check.
2. signed_and_complete - Required signatures, company stamps/seals, and commissioner of oaths endorsements (for sworn forms and statutory declarations) are present, and no required field is left blank. Name anything missing.
3. in_date - Certificates that expire (certificate of good conduct, tax compliance certificate, CRB report, etc.) are still valid on today's date, and dated forms are recent enough to be credible. Use not_applicable for documents with no validity period. Put any expiry date you can read in expiry_date as YYYY-MM-DD.
4. names_match - The company name matches the client (allowing for trading names and "Ltd"/"Limited"), and names of directors or shareholders are consistent within the document. Note any name you cannot reconcile.

recommendation: "verify" only when all applicable checks pass; "reject" when any check clearly fails; otherwise "unsure". A poor scan you cannot read is "unsure", not "reject".

Keep each note to one or two sentences, and the summary to two or three sentences a case manager can act on.`;

type Candidate = { documentId: string; itemName: string; form: string | null; status: string };

type QueuedUpload = {
  id: string;
  application_id: string;
  zoho_file_id: string;
  zoho_file_name: string;
};

function buildFileBlock(
  fileName: string,
  buffer: Buffer,
): Anthropic.Beta.BetaContentBlockParam | { skip: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (buffer.byteLength > MAX_FILE_BYTES) {
    return { skip: `File is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB, over the 20MB limit for automatic checking.` };
  }
  if (ext === "pdf") {
    return {
      type: "document",
      title: fileName,
      source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
    };
  }
  if (IMAGE_TYPES[ext]) {
    return {
      type: "image",
      source: { type: "base64", media_type: IMAGE_TYPES[ext], data: buffer.toString("base64") },
    };
  }
  if (ext === "txt" || ext === "csv") {
    return {
      type: "document",
      title: fileName,
      source: { type: "text", media_type: "text/plain", data: buffer.toString("utf8") },
    };
  }
  return { skip: `.${ext || "unknown"} files can't be read automatically - save it as PDF or check it by hand.` };
}

async function loadCandidates(supabase: SupabaseClient, applicationId: string): Promise<Candidate[]> {
  const { data: application } = await supabase
    .from("applications")
    .select("stage")
    .eq("id", applicationId)
    .single();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, status, checklist_template:checklist_templates(item_name, form, stage, sort_order)")
    .eq("application_id", applicationId)
    .in("status", ["missing", "rejected"]);

  return (documents ?? [])
    .map((doc) => ({ doc, template: Array.isArray(doc.checklist_template) ? doc.checklist_template[0] : doc.checklist_template }))
    .filter(({ template }) => template?.stage === application?.stage)
    .sort((a, b) => (a.template?.sort_order ?? 0) - (b.template?.sort_order ?? 0))
    .map(({ doc, template }) => ({
      documentId: doc.id as string,
      itemName: template?.item_name ?? "Unknown item",
      form: template?.form ?? null,
      status: doc.status as string,
    }));
}

async function reviewUpload(anthropic: Anthropic, supabase: SupabaseClient, upload: QueuedUpload) {
  const { data: application } = await supabase
    .from("applications")
    .select("client:clients(company_name)")
    .eq("id", upload.application_id)
    .single();
  const client = Array.isArray(application?.client) ? application?.client[0] : application?.client;
  const candidates = await loadCandidates(supabase, upload.application_id);

  if (candidates.length === 0) {
    await supabase
      .from("pending_uploads")
      .update({ ai_status: "skipped", ai_error: "No outstanding checklist items to match this file to.", ai_checked_at: new Date().toISOString() })
      .eq("id", upload.id);
    return;
  }

  const { buffer } = await downloadWorkdriveFile(upload.zoho_file_id);
  const fileBlock = buildFileBlock(upload.zoho_file_name, buffer);

  if ("skip" in fileBlock) {
    await supabase
      .from("pending_uploads")
      .update({ ai_status: "skipped", ai_error: fileBlock.skip, ai_checked_at: new Date().toISOString() })
      .eq("id", upload.id);
    return;
  }

  const checklist = candidates
    .map((c, i) => `${i + 1}. ${c.itemName}${c.form && c.form !== "N/A" ? ` (form: ${c.form})` : ""}${c.status === "rejected" ? " - previously rejected, resubmission" : ""}`)
    .join("\n");

  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Review) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          fileBlock,
          {
            type: "text",
            text: `Client company: ${client?.company_name ?? "Unknown"}\nFile name: ${upload.zoho_file_name}\nToday's date: ${new Date().toISOString().slice(0, 10)}\n\nOutstanding checklist items:\n${checklist}`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(
      response.stop_reason === "refusal"
        ? "The model declined to review this file - check it by hand."
        : `No usable review returned (stop reason: ${response.stop_reason}).`,
    );
  }

  const review = response.parsed_output;
  const matched =
    review.matched_item_number && review.matched_item_number >= 1 && review.matched_item_number <= candidates.length
      ? candidates[review.matched_item_number - 1]
      : null;
  const expiry = review.expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(review.expiry_date) ? review.expiry_date : null;

  const { error } = await supabase
    .from("pending_uploads")
    .update({
      ai_status: "done",
      ai_suggested_document_id: matched?.documentId ?? null,
      ai_recommendation: review.recommendation,
      ai_summary: review.summary,
      ai_checks: review.checks,
      ai_expiry_date: expiry,
      ai_model: response.model,
      ai_input_tokens: response.usage.input_tokens,
      ai_output_tokens: response.usage.output_tokens,
      ai_checked_at: new Date().toISOString(),
      ai_error: null,
    })
    .eq("id", upload.id);

  if (error) throw new Error(error.message);
}

/**
 * Reviews queued uploads, oldest first, a few at a time. Anything left over
 * stays queued for the next run - the per-run cap bounds both the function's
 * run time and the day's API spend.
 */
export async function runVerification(
  supabase: SupabaseClient,
  options: { applicationId?: string; limit?: number } = {},
) {
  if (!isVerificationEnabled()) {
    return { enabled: false as const, reviewed: 0, failed: 0 };
  }

  const limit = options.limit ?? (Number(process.env.VERIFICATION_MAX_FILES_PER_RUN) || DEFAULT_MAX_FILES_PER_RUN);

  let query = supabase
    .from("pending_uploads")
    .select("id, application_id, zoho_file_id, zoho_file_name, application:applications!inner(status)")
    .eq("status", "pending")
    .eq("ai_status", "queued")
    .eq("application.status", "active")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (options.applicationId) query = query.eq("application_id", options.applicationId);

  const { data: queued, error } = await query;
  if (error) throw new Error(error.message);

  const anthropic = new Anthropic();
  const uploads = (queued ?? []) as unknown as QueuedUpload[];
  let reviewed = 0;
  let failed = 0;

  for (let i = 0; i < uploads.length; i += CONCURRENCY) {
    await Promise.all(
      uploads.slice(i, i + CONCURRENCY).map(async (upload) => {
        try {
          await reviewUpload(anthropic, supabase, upload);
          reviewed += 1;
        } catch (err) {
          failed += 1;
          await supabase
            .from("pending_uploads")
            .update({
              ai_status: "error",
              ai_error: err instanceof Error ? err.message : String(err),
              ai_checked_at: new Date().toISOString(),
            })
            .eq("id", upload.id);
        }
      }),
    );
  }

  return { enabled: true as const, reviewed, failed };
}

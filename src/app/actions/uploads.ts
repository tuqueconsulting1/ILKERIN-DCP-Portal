"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logDocumentReceivedNotification } from "@/lib/notifications";
import { isVerificationEnabled, runVerification } from "@/lib/verification";

/**
 * Matches a WorkDrive file to a checklist item. `outcome` defaults to
 * "received" (a plain manual match); accepting an automated review passes
 * "verified" or "rejected", and the expiry date it read off the document.
 */
export async function matchPendingUpload(
  pendingUploadId: string,
  documentId: string,
  applicationId: string,
  outcome: "received" | "verified" | "rejected" = "received",
  expiryDate: string | null = null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: pendingUpload, error: pendingErr } = await supabase
    .from("pending_uploads")
    .select("zoho_file_id, zoho_file_url, zoho_uploaded_time")
    .eq("id", pendingUploadId)
    .single();

  if (pendingErr || !pendingUpload) {
    return { error: pendingErr?.message ?? "Pending upload not found." };
  }

  const update: Record<string, unknown> = {
    status: outcome,
    zoho_file_id: pendingUpload.zoho_file_id,
    zoho_file_url: pendingUpload.zoho_file_url,
    uploaded_at: pendingUpload.zoho_uploaded_time ?? new Date().toISOString(),
  };
  if (outcome === "verified") {
    update.verified_by = user.id;
    update.verified_at = new Date().toISOString();
  }
  if (expiryDate) {
    update.expiry_date = expiryDate;
  }

  const { error: docErr } = await supabase.from("documents").update(update).eq("id", documentId);

  if (docErr) {
    return { error: docErr.message };
  }

  const { error: pendingUpdateErr } = await supabase
    .from("pending_uploads")
    .update({ status: "matched", matched_document_id: documentId })
    .eq("id", pendingUploadId);

  if (pendingUpdateErr) {
    return { error: pendingUpdateErr.message };
  }

  await logDocumentReceivedNotification(supabase, documentId, applicationId);

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/ndtcp");
  return { success: true };
}

export async function ignorePendingUpload(pendingUploadId: string, applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("pending_uploads")
    .update({ status: "ignored" })
    .eq("id", pendingUploadId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  return { success: true };
}

/**
 * "Check now" on the case page: reviews this case's queued files straight
 * away instead of waiting for the daily run. Files whose last review errored
 * (e.g. a Zoho or API hiccup) are retried; skipped ones are not, since an
 * unreadable file type won't change on retry.
 */
export async function runCaseVerification(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }
  if (!isVerificationEnabled()) {
    return { error: "Automatic document checking isn't switched on yet." };
  }

  await supabase
    .from("pending_uploads")
    .update({ ai_status: "queued", ai_error: null })
    .eq("application_id", applicationId)
    .eq("status", "pending")
    .eq("ai_status", "error");

  try {
    const result = await runVerification(supabase, { applicationId, limit: 10 });
    revalidatePath(`/cases/${applicationId}`);
    return { success: true, reviewed: result.reviewed, failed: result.failed };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

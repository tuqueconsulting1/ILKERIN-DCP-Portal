"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ignorePendingUpload, matchPendingUpload, runCaseVerification } from "@/app/actions/uploads";

type CheckResult = "pass" | "fail" | "unclear" | "not_applicable";
type AiChecks = Record<"right_document" | "signed_and_complete" | "in_date" | "names_match", { result: CheckResult; note: string }>;

export type PendingUpload = {
  id: string;
  zoho_file_name: string;
  zoho_uploaded_time: string | null;
  ai_status: "queued" | "done" | "error" | "skipped";
  ai_suggested_document_id: string | null;
  ai_recommendation: "verify" | "reject" | "unsure" | null;
  ai_summary: string | null;
  ai_checks: AiChecks | null;
  ai_expiry_date: string | null;
  ai_error: string | null;
};

export type MissingDocumentOption = {
  id: string;
  item_name: string;
};

const CHECK_LABEL: Record<keyof AiChecks, string> = {
  right_document: "Right document",
  signed_and_complete: "Signed & complete",
  in_date: "In date",
  names_match: "Names match",
};

const CHECK_STYLE: Record<CheckResult, { mark: string; className: string }> = {
  pass: { mark: "✓", className: "text-emerald-700 dark:text-emerald-400" },
  fail: { mark: "✗", className: "text-red-700 dark:text-red-400" },
  unclear: { mark: "?", className: "text-amber-700 dark:text-amber-400" },
  not_applicable: { mark: "–", className: "text-zinc-400 dark:text-zinc-500" },
};

const RECOMMENDATION_STYLE = {
  verify: { label: "Recommends verify", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  reject: { label: "Recommends reject", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  unsure: { label: "Needs a closer look", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
};

function AiReview({ upload }: { upload: PendingUpload }) {
  if (upload.ai_status === "queued") {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">Waiting for automatic check</p>;
  }
  if (upload.ai_status !== "done") {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {upload.ai_status === "error" ? "Automatic check failed: " : "Not checked automatically: "}
        {upload.ai_error}
      </p>
    );
  }

  const rec = upload.ai_recommendation ? RECOMMENDATION_STYLE[upload.ai_recommendation] : null;

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {rec && <span className={`rounded px-1.5 py-0.5 font-medium ${rec.className}`}>{rec.label}</span>}
        {upload.ai_expiry_date && (
          <span className="text-zinc-500 dark:text-zinc-400">Expires {upload.ai_expiry_date}</span>
        )}
      </div>
      {upload.ai_summary && <p className="text-zinc-700 dark:text-zinc-300">{upload.ai_summary}</p>}
      {upload.ai_checks && (
        <ul className="grid gap-1 sm:grid-cols-2">
          {(Object.keys(CHECK_LABEL) as Array<keyof AiChecks>).map((key) => {
            const check = upload.ai_checks?.[key];
            if (!check) return null;
            const style = CHECK_STYLE[check.result];
            return (
              <li key={key} className="min-w-0">
                <span className={`font-medium ${style.className}`}>
                  {style.mark} {CHECK_LABEL[key]}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400"> - {check.note}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UploadRow({
  applicationId,
  upload,
  options,
  locked,
  verificationEnabled,
}: {
  applicationId: string;
  upload: PendingUpload;
  options: MissingDocumentOption[];
  locked: boolean;
  verificationEnabled: boolean;
}) {
  const suggested = options.some((opt) => opt.id === upload.ai_suggested_document_id)
    ? (upload.ai_suggested_document_id as string)
    : null;
  const [selected, setSelected] = useState(suggested ?? options[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const reviewed = verificationEnabled && upload.ai_status === "done";

  function match(outcome: "received" | "verified" | "rejected") {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await matchPendingUpload(
        upload.id,
        selected,
        applicationId,
        outcome,
        outcome === "verified" ? upload.ai_expiry_date : null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function ignore() {
    setError(null);
    startTransition(async () => {
      const result = await ignorePendingUpload(upload.id, applicationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="animate-fade-in space-y-2 border-b border-zinc-100 dark:border-zinc-700 py-3 text-sm first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 break-words font-medium text-zinc-900 dark:text-zinc-100">{upload.zoho_file_name}</span>
        {locked ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Locked</span>
        ) : options.length > 0 ? (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="max-w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.id === suggested ? `${opt.item_name} (suggested)` : opt.item_name}
                </option>
              ))}
            </select>
            {reviewed ? (
              <>
                <button
                  disabled={pending}
                  onClick={() => match("verified")}
                  className="rounded-md bg-brand-dark px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
                >
                  Match &amp; verify
                </button>
                <button
                  disabled={pending}
                  onClick={() => match("rejected")}
                  className="rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-red-400 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50"
                >
                  Match &amp; reject
                </button>
                <button
                  disabled={pending}
                  onClick={() => match("received")}
                  className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-50"
                >
                  Match only
                </button>
              </>
            ) : (
              <button
                disabled={pending}
                onClick={() => match("received")}
                className="rounded-md bg-brand-dark px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
              >
                Match
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">No missing checklist items to match</span>
        )}
        {!locked && (
          <button
            disabled={pending}
            onClick={ignore}
            className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-50"
          >
            Ignore
          </button>
        )}
      </div>
      {verificationEnabled && !locked && <AiReview upload={upload} />}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function CheckNowButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await runCaseVerification(applicationId);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        result.failed
          ? `Checked ${result.reviewed}, ${result.failed} failed.`
          : result.reviewed
            ? `Checked ${result.reviewed} file${result.reviewed === 1 ? "" : "s"}.`
            : "Nothing waiting to be checked.",
      );
      router.refresh();
    });
  }

  return (
    <span className="flex items-center gap-2">
      {message && <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{message}</span>}
      <button
        disabled={pending}
        onClick={run}
        className="text-xs font-medium text-brand-dark dark:text-brand transition-colors hover:underline disabled:opacity-50"
      >
        {pending ? "Checking… (can take a few minutes)" : "Check now"}
      </button>
    </span>
  );
}

export function PendingUploads({
  applicationId,
  uploads,
  missingDocuments,
  locked = false,
  verificationEnabled = false,
}: {
  applicationId: string;
  uploads: PendingUpload[];
  missingDocuments: MissingDocumentOption[];
  locked?: boolean;
  verificationEnabled?: boolean;
}) {
  if (uploads.length === 0) return null;

  const hasUnchecked = uploads.some((u) => u.ai_status === "queued" || u.ai_status === "error");

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Unmatched uploads <span className="font-normal text-zinc-400 dark:text-zinc-500">({uploads.length})</span>
        </h2>
        {verificationEnabled && !locked && hasUnchecked && <CheckNowButton applicationId={applicationId} />}
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">
        {uploads.map((upload) => (
          <UploadRow
            key={upload.id}
            applicationId={applicationId}
            upload={upload}
            options={missingDocuments}
            locked={locked}
            verificationEnabled={verificationEnabled}
          />
        ))}
      </div>
    </section>
  );
}

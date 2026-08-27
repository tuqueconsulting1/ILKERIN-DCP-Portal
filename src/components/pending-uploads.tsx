"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ignorePendingUpload, matchPendingUpload } from "@/app/actions/uploads";

export type PendingUpload = {
  id: string;
  zoho_file_name: string;
  zoho_uploaded_time: string | null;
};

export type MissingDocumentOption = {
  id: string;
  item_name: string;
};

function UploadRow({
  applicationId,
  upload,
  options,
  locked,
}: {
  applicationId: string;
  upload: PendingUpload;
  options: MissingDocumentOption[];
  locked: boolean;
}) {
  const [selected, setSelected] = useState(options[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function match() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await matchPendingUpload(upload.id, selected, applicationId);
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
    <div className="animate-fade-in flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-700 py-2 text-sm last:border-0">
      <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-100">{upload.zoho_file_name}</span>
      {locked ? (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">Locked</span>
      ) : options.length > 0 ? (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.item_name}
              </option>
            ))}
          </select>
          <button
            disabled={pending}
            onClick={match}
            className="rounded-md bg-brand-dark px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
          >
            Match
          </button>
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
      {error && <span className="w-full text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

export function PendingUploads({
  applicationId,
  uploads,
  missingDocuments,
  locked = false,
}: {
  applicationId: string;
  uploads: PendingUpload[];
  missingDocuments: MissingDocumentOption[];
  locked?: boolean;
}) {
  if (uploads.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Unmatched uploads <span className="font-normal text-zinc-400 dark:text-zinc-500">({uploads.length})</span>
      </h2>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">
        {uploads.map((upload) => (
          <UploadRow
            key={upload.id}
            applicationId={applicationId}
            upload={upload}
            options={missingDocuments}
            locked={locked}
          />
        ))}
      </div>
    </section>
  );
}

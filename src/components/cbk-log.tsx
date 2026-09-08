"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logCbkQuery, markCbkResponded } from "@/app/actions/cbk";

export type CbkEntry = {
  id: string;
  query_text: string;
  received_date: string;
  response_deadline: string | null;
  response_status: string;
  response_text: string | null;
  query_zoho_file_url: string | null;
  query_zoho_file_name: string | null;
  response_zoho_file_url: string | null;
  response_zoho_file_name: string | null;
};

const fileInputClass =
  "block w-full text-xs text-zinc-500 dark:text-zinc-400 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-100 dark:file:bg-zinc-700 file:px-2 file:py-1 file:text-xs file:font-medium file:text-zinc-700 dark:file:text-zinc-300";

function Attachment({ url, name }: { url: string | null; name: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-brand-dark dark:text-brand underline underline-offset-2"
    >
      📎 {name ?? "Attachment"}
    </a>
  );
}

function CbkRow({ entry, applicationId, locked }: { entry: CbkEntry; applicationId: string; locked: boolean }) {
  const [responding, setResponding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleRespond(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await markCbkResponded(entry.id, applicationId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setResponding(false);
      router.refresh();
    });
  }

  return (
    <li className="animate-fade-in text-zinc-700 dark:text-zinc-300">
      <p>{entry.query_text}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Received {entry.received_date} · due {entry.response_deadline ?? "—"} · {entry.response_status}
      </p>
      <Attachment url={entry.query_zoho_file_url} name={entry.query_zoho_file_name} />
      {entry.response_text && <p className="text-xs text-zinc-600 dark:text-zinc-400">Response: {entry.response_text}</p>}
      <Attachment url={entry.response_zoho_file_url} name={entry.response_zoho_file_name} />

      {!locked && entry.response_status !== "responded" && !responding && (
        <button
          onClick={() => setResponding(true)}
          className="mt-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand"
        >
          Mark responded
        </button>
      )}

      {responding && (
        <form onSubmit={handleRespond} className="mt-2 space-y-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 p-2">
          <textarea
            name="responseText"
            placeholder="Response summary"
            required
            rows={2}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <input type="file" name="responseFile" className={fileInputClass} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand-dark px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setResponding(false)}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </form>
      )}
    </li>
  );
}

export function CbkLog({
  applicationId,
  entries,
  locked,
}: {
  applicationId: string;
  entries: CbkEntry[];
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await logCbkQuery(applicationId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
      {entries.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => (
            <CbkRow key={entry.id} entry={entry} applicationId={applicationId} locked={locked} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No CBK correspondence logged.</p>
      )}

      {!locked && (
        <form ref={formRef} onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-zinc-100 dark:border-zinc-700 pt-3">
          <textarea
            name="queryText"
            placeholder="What did CBK ask?"
            required
            rows={2}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-400 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-zinc-500 dark:text-zinc-400">
              Received
              <input
                name="receivedDate"
                type="date"
                className="mt-0.5 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="flex-1 text-xs text-zinc-500 dark:text-zinc-400">
              Response due
              <input
                name="responseDeadline"
                type="date"
                className="mt-0.5 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          </div>
          <input type="file" name="queryFile" className={fileInputClass} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-dark px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
          >
            Log query
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

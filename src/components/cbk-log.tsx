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
};

function CbkRow({ entry, applicationId, locked }: { entry: CbkEntry; applicationId: string; locked: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function respond() {
    const responseText = window.prompt("Response summary:");
    if (responseText === null) return;

    startTransition(async () => {
      await markCbkResponded(entry.id, applicationId, responseText);
      router.refresh();
    });
  }

  return (
    <li className="animate-fade-in text-zinc-700 dark:text-zinc-300">
      <p>{entry.query_text}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Received {entry.received_date} · due {entry.response_deadline ?? "—"} · {entry.response_status}
      </p>
      {entry.response_text && <p className="text-xs text-zinc-600 dark:text-zinc-400">Response: {entry.response_text}</p>}
      {!locked && entry.response_status !== "responded" && (
        <button
          disabled={pending}
          onClick={respond}
          className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand disabled:opacity-50"
        >
          Mark responded
        </button>
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

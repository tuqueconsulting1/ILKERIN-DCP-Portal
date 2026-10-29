"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSelfAsCaseManager } from "@/app/actions/clients";

export function CaseManagerAssign({
  clientId,
  applicationId,
  managerName,
  isMe,
  locked,
}: {
  clientId: string;
  applicationId: string;
  managerName: string | null;
  isMe: boolean;
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(assign: boolean) {
    if (assign && managerName && !window.confirm(`This case is assigned to ${managerName}. Take it over?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setSelfAsCaseManager(clientId, applicationId, assign);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <span>
        Case manager:{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {managerName ? (isMe ? `${managerName} (you)` : managerName) : "Unassigned"}
        </span>
      </span>
      {!locked &&
        (isMe ? (
          <button
            onClick={() => run(false)}
            disabled={pending}
            className="text-xs text-zinc-400 dark:text-zinc-500 transition-colors hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Unassign me"}
          </button>
        ) : (
          <button
            onClick={() => run(true)}
            disabled={pending}
            className="rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:border-brand hover:text-brand-dark dark:hover:text-brand disabled:opacity-50"
          >
            {pending ? "Saving…" : managerName ? "Take over case" : "Assign to me"}
          </button>
        ))}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

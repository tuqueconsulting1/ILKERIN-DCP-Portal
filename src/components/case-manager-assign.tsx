"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignCaseManager, type AssignableCaseManager } from "@/app/actions/clients";

export function CaseManagerAssign({
  clientId,
  applicationId,
  managerId,
  managerName,
  currentUserId,
  options,
  locked,
}: {
  clientId: string;
  applicationId: string;
  managerId: string | null;
  managerName: string | null;
  currentUserId: string | null;
  options: AssignableCaseManager[];
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isMe = Boolean(currentUserId && managerId === currentUserId);

  function assign(profileId: string | null) {
    if (profileId === managerId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignCaseManager(clientId, applicationId, profileId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (locked) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Case manager:{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{managerName ?? "Unassigned"}</span>
      </p>
    );
  }

  // The current manager might not be on the allowlist (e.g. a password
  // account, or removed from the list since) - keep them selectable so the
  // dropdown still shows who holds the case.
  const showCurrentSeparately = managerId && !options.some((o) => o.profileId === managerId);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <label htmlFor="case-manager-select">Case manager:</label>
      <select
        id="case-manager-select"
        value={managerId ?? ""}
        disabled={pending}
        onChange={(e) => assign(e.target.value || null)}
        className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {showCurrentSeparately && <option value={managerId}>{managerName ?? "Current manager"}</option>}
        {options.map((o) => (
          <option key={o.email} value={o.profileId ?? `pending:${o.email}`} disabled={!o.profileId}>
            {o.email}
            {o.profileId === currentUserId ? " (you)" : ""}
            {!o.profileId ? " - hasn't signed in yet" : ""}
          </option>
        ))}
      </select>
      {!isMe && currentUserId && (
        <button
          onClick={() => assign(currentUserId)}
          disabled={pending}
          className="rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:border-brand hover:text-brand-dark dark:hover:text-brand disabled:opacity-50"
        >
          Assign to me
        </button>
      )}
      {pending && <span className="text-xs">Saving…</span>}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

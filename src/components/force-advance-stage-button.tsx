"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { forceAdvanceStage } from "@/app/actions/cases";

const STAGE_LABEL: Record<string, string> = {
  stage_1: "Stage 1",
  stage_2: "Stage 2",
  stage_3: "Stage 3",
};

export function ForceAdvanceStageButton({
  applicationId,
  nextStage,
  outstandingCount,
}: {
  applicationId: string;
  nextStage: string;
  outstandingCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    const label = STAGE_LABEL[nextStage] ?? nextStage;
    const warning =
      outstandingCount > 0
        ? `${outstandingCount} item${outstandingCount === 1 ? " is" : "s are"} still unverified in the current stage. `
        : "";
    if (
      !window.confirm(
        `${warning}Advance this case to ${label} anyway? The unverified items will stay on record and stay visible under "Previous stages".`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await forceAdvanceStage(applicationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:border-brand-dark dark:hover:border-brand hover:text-brand-dark dark:hover:text-brand disabled:opacity-50"
      >
        {pending ? "Advancing…" : `Advance to ${STAGE_LABEL[nextStage] ?? nextStage} anyway →`}
      </button>
      {error && <span className="animate-fade-in text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

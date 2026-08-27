"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveToPreviousStage } from "@/app/actions/cases";

const STAGE_LABEL: Record<string, string> = {
  stage_1: "Stage 1",
  stage_2: "Stage 2",
  stage_3: "Stage 3",
};

export function BackStageButton({
  applicationId,
  previousStage,
}: {
  applicationId: string;
  previousStage: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    const label = STAGE_LABEL[previousStage] ?? previousStage;
    if (
      !window.confirm(
        `Send this case back to ${label}? Its checklist items will be reset to "missing" and will need to be re-verified.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await moveToPreviousStage(applicationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:border-brand-dark dark:hover:border-brand hover:text-brand-dark dark:hover:text-brand disabled:opacity-50"
      >
        {pending ? "Moving…" : `← Back to ${STAGE_LABEL[previousStage] ?? previousStage}`}
      </button>
      {error && <span className="animate-fade-in text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeCase } from "@/app/actions/cases";

export function CompleteCaseButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    if (!window.confirm("Mark this case complete? The checklist will be locked from further edits.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await completeCase(applicationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Navigate back to the dashboard so the completion confetti plays there.
      router.push("/?completed=1");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-800 active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Completing…" : "Licence received — Complete case"}
      </button>
      {error && <span className="animate-fade-in text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

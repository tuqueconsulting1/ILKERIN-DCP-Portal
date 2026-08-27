"use client";

import { useRef, useState, useTransition } from "react";
import { addClient } from "@/app/actions/clients";

const inputClass =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-400 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setWarning(null);

    startTransition(async () => {
      const result = await addClient({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();

      if (result.warning) {
        setWarning(result.warning);
        return;
      }

      setOpen(false);
    });
  }

  return (
    <>
      <button
        data-tour="add-client"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand/90 active:scale-[0.98]"
      >
        + Add client
      </button>

      {open && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="animate-scale-in w-full max-w-md rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-lg">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add client</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Close
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="companyName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Company name
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  required
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="stage" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Starting stage — the work to be done
                </label>
                <select
                  id="stage"
                  name="stage"
                  defaultValue="stage_1"
                  className={inputClass}
                >
                  <option value="stage_1">Stage 1 — Approval of Name</option>
                  <option value="stage_2">Stage 2 — Application for Licence</option>
                  <option value="stage_3">Stage 3 — Data Submission & Licensing</option>
                </select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  The full document checklist for this stage is created automatically.
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="workdriveFolderUrl" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  WorkDrive folder link{" "}
                  <span className="font-normal text-zinc-400 dark:text-zinc-500">(optional, for in-progress clients)</span>
                </label>
                <input
                  id="workdriveFolderUrl"
                  name="workdriveFolderUrl"
                  type="url"
                  placeholder="https://workdrive.zoho.com/..."
                  className={inputClass}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Leave blank for a brand-new client — a folder will be created automatically once
                  that&apos;s set up.
                </p>
              </div>

              {error && <p className="animate-fade-in text-sm text-red-600 dark:text-red-400">{error}</p>}
              {warning && <p className="animate-fade-in text-sm text-amber-700 dark:text-amber-400">{warning}</p>}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-brand-dark px-3 py-2 text-sm font-medium text-white transition-all hover:bg-brand-dark/90 active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add client"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

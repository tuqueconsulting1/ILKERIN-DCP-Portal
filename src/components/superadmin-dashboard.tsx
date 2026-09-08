"use client";

import { useState } from "react";
import { addZohoAllowedEmail, removeZohoAllowedEmail } from "@/app/actions/superadmin";
import { SignOutButton } from "@/components/sign-out-button";

export type AllowedEmail = {
  email: string;
  created_at: string;
};

export function SuperAdminDashboard({ initialEmails }: { initialEmails: AllowedEmail[] }) {
  const [emails, setEmails] = useState(initialEmails);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await addZohoAllowedEmail(newEmail);
    setSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setEmails((prev) => [
      { email: newEmail.trim().toLowerCase(), created_at: new Date().toISOString() },
      ...prev,
    ]);
    setNewEmail("");
  }

  async function handleRemove(email: string) {
    setRemovingEmail(email);
    setError(null);
    const previous = emails;

    setEmails((prev) => prev.filter((e) => e.email !== email));

    const result = await removeZohoAllowedEmail(email);
    setRemovingEmail(null);

    if (result?.error) {
      setEmails(previous);
      setError(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Super admin</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Emails allowed to sign in via Zoho
          </p>
        </div>
        <SignOutButton />
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-6 flex gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4"
      >
        <input
          type="email"
          required
          placeholder="name@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-dark px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-dark/90 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </form>

      {error && (
        <p className="animate-fade-in mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Added</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
            {emails.map((e) => (
              <tr key={e.email} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{e.email}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {new Date(e.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleRemove(e.email)}
                    disabled={removingEmail === e.email}
                    className="text-xs font-medium text-red-600 dark:text-red-400 transition-colors hover:text-red-800 dark:hover:text-red-400 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {emails.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No emails allowed yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

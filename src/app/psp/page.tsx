import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default function PspDashboardPage() {
  return (
    <div className="relative flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950 px-6 py-8">
      <div aria-hidden className="dot-grid-bg pointer-events-none absolute inset-x-0 top-0 h-80 w-full" />
      <div className="animate-fade-in relative mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand">
          ← All modules
        </Link>
        <div className="mt-2 mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">PSP dashboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Payment Service Providers</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

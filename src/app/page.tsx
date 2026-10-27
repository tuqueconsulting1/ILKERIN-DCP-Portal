import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const MODULES = [
  {
    href: "/ndtcp",
    name: "NDTCP",
    title: "Non-Deposit Taking Credit Providers",
    body: "CBK licensing workflow - client cases, stage checklists, tasks and CBK correspondence.",
  },
  {
    href: "/psp",
    name: "PSP",
    title: "Payment Service Providers",
    body: "Payment service provider licensing.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950 px-6 py-8">
      <div aria-hidden className="dot-grid-bg pointer-events-none absolute inset-x-0 top-0 h-80 w-full" />
      <div className="animate-fade-in relative mx-auto max-w-4xl">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Financial Services Sector Licences Portal
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose a licensing module</p>
          </div>
          <SignOutButton />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-brand"
            >
              <p className="text-2xl font-semibold text-brand">{m.name}</p>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{m.title}</p>
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{m.body}</p>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-brand">
                Open {m.name} →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

export type ApplicationBoardRow = {
  application_id: string;
  client_id: string;
  stage: "stage_1" | "stage_2" | "stage_3";
  application_status: "active" | "complete" | "withdrawn";
  completion_pct: number;
  updated_at: string;
  company_name: string;
  case_manager_name: string | null;
  total_items: number;
  verified_items: number;
  missing_items: number;
  pending_review_items: number;
  expiring_soon_items: number;
  open_tasks: number;
  overdue_tasks: number;
  pending_cbk_queries: number;
};

const STAGE_LABEL: Record<string, string> = {
  stage_1: "Stage 1 — Approval of Name",
  stage_2: "Stage 2 — Application for Licence",
  stage_3: "Stage 3 — Data Submission & Licensing",
};

const BOARD_COLUMNS = [
  { key: "stage_1", label: "Stage 1 — Approval of Name" },
  { key: "stage_2", label: "Stage 2 — Application for Licence" },
  { key: "stage_3", label: "Stage 3 — Data Submission & Licensing" },
  { key: "complete", label: "Complete" },
] as const;

function NotificationBadges({ row }: { row: ApplicationBoardRow }) {
  if (row.overdue_tasks === 0 && row.expiring_soon_items === 0 && row.pending_cbk_queries === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {row.overdue_tasks > 0 && (
        <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
          {row.overdue_tasks} overdue
        </span>
      )}
      {row.expiring_soon_items > 0 && (
        <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
          {row.expiring_soon_items} expiring soon
        </span>
      )}
      {row.pending_cbk_queries > 0 && (
        <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
          {row.pending_cbk_queries} CBK query
        </span>
      )}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ClientCard({ row }: { row: ApplicationBoardRow }) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
      <Link href={`/cases/${row.application_id}`} className="block space-y-2">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.company_name}</p>
        <ProgressBar pct={row.completion_pct} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {row.verified_items}/{row.total_items} items verified · {row.case_manager_name ?? "Unassigned"}
        </p>
      </Link>
      <div className="flex items-center gap-2">
        <NotificationBadges row={row} />
        <Link
          href={`/cases/${row.application_id}/progress`}
          className="ml-auto shrink-0 text-xs text-zinc-400 dark:text-zinc-500 transition-colors hover:text-brand-dark dark:hover:text-brand"
        >
          Visualize →
        </Link>
      </div>
    </div>
  );
}

function BoardView({ rows }: { rows: ApplicationBoardRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {BOARD_COLUMNS.map((column) => {
        const columnRows = rows.filter((row) =>
          column.key === "complete" ? row.application_status === "complete" : row.stage === column.key && row.application_status === "active",
        );

        const isComplete = column.key === "complete";

        return (
          <div
            key={column.key}
            data-tour={column.key === "stage_1" ? "stage-column" : isComplete ? "complete-column" : undefined}
            className={`rounded-lg p-3 ${isComplete ? "bg-brand-dark/[0.04] ring-1 ring-brand/20 dark:bg-brand/10" : "bg-zinc-100 dark:bg-zinc-900"}`}
          >
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h3 className={`text-sm font-semibold ${isComplete ? "text-brand-dark dark:text-brand" : "text-zinc-700 dark:text-zinc-300"}`}>
                {column.label}
              </h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{columnRows.length}</span>
            </div>
            <div className="space-y-2">
              {columnRows.map((row) => (
                <ClientCard key={row.application_id} row={row} />
              ))}
              {columnRows.length === 0 && (
                <p className="px-1 text-xs text-zinc-400 dark:text-zinc-500">No clients here.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ rows }: { rows: ApplicationBoardRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-2 font-medium">Client</th>
            <th className="px-4 py-2 font-medium">Stage</th>
            <th className="px-4 py-2 font-medium">Progress</th>
            <th className="px-4 py-2 font-medium">Case manager</th>
            <th className="px-4 py-2 font-medium">Notifications</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
          {rows.map((row) => (
            <tr key={row.application_id}>
              <td className="px-4 py-3">
                <Link
                  href={`/cases/${row.application_id}`}
                  className="font-medium text-zinc-900 dark:text-zinc-100 transition-colors hover:text-brand hover:underline"
                >
                  {row.company_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {row.application_status === "complete" ? "Complete" : STAGE_LABEL[row.stage]}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <ProgressBar pct={row.completion_pct} />
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.completion_pct}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.case_manager_name ?? "Unassigned"}</td>
              <td className="px-4 py-3">
                <NotificationBadges row={row} />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/cases/${row.application_id}/progress`}
                  className="text-xs text-zinc-400 dark:text-zinc-500 transition-colors hover:text-brand-dark dark:hover:text-brand"
                >
                  Visualize →
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No clients yet. Add one to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CaseBoard({ rows }: { rows: ApplicationBoardRow[] }) {
  const [view, setView] = useState<"board" | "list">("board");

  return (
    <div className="space-y-4">
      <div data-tour="view-toggle" className="flex gap-1 rounded-md bg-zinc-100 dark:bg-zinc-900 p-1 text-sm w-fit">
        {(["board", "list"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1 capitalize transition-colors ${
              view === v ? "bg-white dark:bg-zinc-800 text-brand-dark dark:text-brand shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "board" ? <BoardView rows={rows} /> : <ListView rows={rows} />}
    </div>
  );
}

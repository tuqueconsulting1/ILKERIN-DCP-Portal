"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  template: string;
  created_at: string;
  related_application_id: string | null;
  companyName: string;
};

const LAST_SEEN_KEY = "ilkerin-dcp-notifications-last-seen";
const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>("");

  useEffect(() => {
    function initLastSeen() {
      setLastSeen(localStorage.getItem(LAST_SEEN_KEY) ?? new Date(0).toISOString());
    }
    initLastSeen();

    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("notification_log")
        .select(
          "id, template, created_at, related_application_id, application:applications(client:clients(company_name))",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      const rows: NotificationRow[] = (data ?? []).map((row) => {
        const application = Array.isArray(row.application) ? row.application[0] : row.application;
        const client = Array.isArray(application?.client) ? application.client[0] : application?.client;

        return {
          id: row.id,
          template: row.template,
          created_at: row.created_at,
          related_application_id: row.related_application_id,
          companyName: client?.company_name ?? "General",
        };
      });

      setNotifications(rows);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => n.created_at > lastSeen).length;

  const grouped = notifications.reduce<Record<string, NotificationRow[]>>((acc, n) => {
    acc[n.companyName] ??= [];
    acc[n.companyName].push(n);
    return acc;
  }, {});

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, now);
      setLastSeen(now);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative text-sm text-white/70 transition-colors hover:text-white"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl">
            <div className="max-h-96 overflow-y-auto p-2">
              {Object.keys(grouped).length === 0 && (
                <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">No notifications yet.</p>
              )}
              {Object.entries(grouped).map(([companyName, items]) => (
                <div key={companyName} className="mb-2 last:mb-0">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {companyName}
                  </p>
                  <ul>
                    {items.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={n.related_application_id ? `/cases/${n.related_application_id}` : "#"}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                        >
                          <span>{n.template}</span>
                          <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">· {timeAgo(n.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

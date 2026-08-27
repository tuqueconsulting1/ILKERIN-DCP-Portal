import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProgressRings, type RingStage } from "@/components/progress-rings";

const STAGE_LABEL: Record<string, string> = {
  stage_1: "Stage 1 — Approval of Name",
  stage_2: "Stage 2 — Application for Licence",
  stage_3: "Stage 3 — Data Submission & Licensing",
};

const STAGE_ORDER = ["stage_1", "stage_2", "stage_3"] as const;

export default async function CaseProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, stage, status, client:clients(company_name)")
    .eq("id", id)
    .single();

  if (appError || !application) {
    notFound();
  }

  const client = Array.isArray(application.client) ? application.client[0] : application.client;

  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("stage")
    .eq("is_active", true);

  const templateCapacity: Record<string, number> = { stage_1: 0, stage_2: 0, stage_3: 0 };
  (templates ?? []).forEach((t) => {
    templateCapacity[t.stage] = (templateCapacity[t.stage] ?? 0) + 1;
  });

  const { data: documentsRaw } = await supabase
    .from("documents")
    .select("status, checklist_template:checklist_templates(item_name, stage)")
    .eq("application_id", id);

  const byStage: Record<string, { total: number; verified: number }> = {
    stage_1: { total: 0, verified: 0 },
    stage_2: { total: 0, verified: 0 },
    stage_3: { total: 0, verified: 0 },
  };

  const remainingChecklist: { item_name: string; status: string; stage: string }[] = [];

  (documentsRaw ?? []).forEach((doc) => {
    const template = Array.isArray(doc.checklist_template)
      ? doc.checklist_template[0]
      : doc.checklist_template;
    const stage = template?.stage;
    if (!stage) return;

    byStage[stage].total += 1;
    if (doc.status === "verified") {
      byStage[stage].verified += 1;
    } else {
      remainingChecklist.push({ item_name: template.item_name, status: doc.status, stage });
    }
  });

  const stages: RingStage[] = STAGE_ORDER.map((stage) => {
    const existing = byStage[stage];
    const started = existing.total > 0;
    const total = started ? existing.total : templateCapacity[stage] ?? 0;
    const verified = existing.verified;
    const pct = total > 0 ? Math.round((verified / total) * 100) : 0;

    return { stage, label: STAGE_LABEL[stage], total, verified, pct, started };
  });

  const overallVerified = stages.reduce((sum, s) => sum + s.verified, 0);
  const overallTotal = stages.reduce((sum, s) => sum + s.total, 0);
  // A completed case is 100% overall by definition, even if it was started
  // partway through (e.g. at Stage 3, skipping 1/2 as already done outside
  // this app) — otherwise unreached stages' template capacity would count
  // against it, contradicting the "Complete" status shown on the case page.
  const overallPct =
    application.status === "complete"
      ? 100
      : overallTotal > 0
        ? Math.round((overallVerified / overallTotal) * 100)
        : 0;

  const { data: openTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .eq("application_id", id)
    .eq("status", "open")
    .order("due_date", { ascending: true });

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 px-6 py-8">
      <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
        <div>
          <Link href={`/cases/${id}`} className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand">
            ← Back to case
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{client?.company_name} — Progress</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {application.status === "complete" ? "Complete" : STAGE_LABEL[application.stage]}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
          <ProgressRings stages={stages} overallPct={overallPct} currentStage={application.stage} />
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Remaining checklist items <span className="font-normal text-zinc-400 dark:text-zinc-500">({remainingChecklist.length})</span>
          </h2>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            {remainingChecklist.length > 0 ? (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-700 text-sm">
                {remainingChecklist.map((item, i) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <span className="text-zinc-800 dark:text-zinc-200">{item.item_name}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {STAGE_LABEL[item.stage]?.split(" — ")[0]} · {item.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing outstanding.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Remaining tasks <span className="font-normal text-zinc-400 dark:text-zinc-500">({openTasks?.length ?? 0})</span>
          </h2>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            {openTasks && openTasks.length > 0 ? (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-700 text-sm">
                {openTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between py-2">
                    <span className="text-zinc-800 dark:text-zinc-200">{task.title}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{task.due_date ?? "no due date"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No open tasks.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

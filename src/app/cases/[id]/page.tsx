import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentChecklist, type ChecklistDocument } from "@/components/document-checklist";
import { WorkdriveLinkEditor } from "@/components/workdrive-link-editor";
import { CopyLink } from "@/components/copy-link";
import { PendingUploads } from "@/components/pending-uploads";
import { CompleteCaseButton } from "@/components/complete-case-button";
import { BackStageButton } from "@/components/back-stage-button";
import { ClientNameEditor } from "@/components/client-name-editor";
import { DeleteClientDialog } from "@/components/delete-client-dialog";
import { TaskList } from "@/components/task-list";
import { CbkLog } from "@/components/cbk-log";
import { GuideMeButton, type TourStep } from "@/components/guided-tour";

const STAGE_LABEL: Record<string, string> = {
  stage_1: "Stage 1 — Approval of Name",
  stage_2: "Stage 2 — Application for Licence",
  stage_3: "Stage 3 — Data Submission & Licensing",
};

const PREVIOUS_STAGE: Record<string, string | undefined> = {
  stage_2: "stage_1",
  stage_3: "stage_2",
};

const CASE_TOUR: TourStep[] = [
  {
    selector: '[data-tour="workdrive-link"]',
    title: "The client's WorkDrive folder",
    body: "Open the folder yourself, or copy the client-facing upload link to share with them. Nothing here requires the client to log into this app.",
  },
  {
    selector: '[data-tour="visualize-progress"]',
    title: "Visualize progress",
    body: "A circular view of progress across all three stages, plus what's still outstanding — handy for a quick status check.",
  },
  {
    selector: '[data-tour="checklist"]',
    title: "The checklist",
    body: "Mark items received or verified as documents come in. Once every item in a stage is verified, the case advances to the next stage automatically.",
  },
  {
    selector: '[data-tour="tasks"]',
    title: "Tasks",
    body: "Add ad-hoc follow-ups with a due date, and check them off as you go.",
  },
  {
    selector: '[data-tour="cbk-log"]',
    title: "CBK correspondence",
    body: "Log a query from CBK — it automatically creates a linked task with the response deadline as its due date.",
  },
];

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application, error: appError } = await supabase
    .from("applications")
    .select(
      "id, stage, status, completion_pct, client:clients(id, company_name, workdrive_folder_url, workdrive_share_link)",
    )
    .eq("id", id)
    .single();

  if (appError || !application) {
    notFound();
  }

  const client = Array.isArray(application.client) ? application.client[0] : application.client;
  const locked = application.status === "complete";

  const { data: documentsRaw } = await supabase
    .from("documents")
    .select(
      "id, status, owner_tag, expiry_date, checklist_template:checklist_templates(item_name, stage)",
    )
    .eq("application_id", id);

  const normalizedDocuments = (documentsRaw ?? []).map((doc) => {
    const template = Array.isArray(doc.checklist_template)
      ? doc.checklist_template[0]
      : doc.checklist_template;

    return {
      id: doc.id,
      status: doc.status,
      owner_tag: doc.owner_tag,
      expiry_date: doc.expiry_date,
      item_name: template?.item_name ?? "Unknown item",
      stage: template?.stage,
    };
  });

  const currentStageDocuments: ChecklistDocument[] = normalizedDocuments
    .filter((doc) => doc.stage === application.stage)
    .map(({ id, status, owner_tag, expiry_date, item_name }) => ({
      id,
      status,
      owner_tag,
      expiry_date,
      item_name,
    }));

  const previousStages = Object.values(
    normalizedDocuments
      .filter((doc) => doc.stage && doc.stage !== application.stage)
      .reduce<Record<string, { stage: string; total: number; verified: number }>>((acc, doc) => {
        const stage = doc.stage as string;
        acc[stage] ??= { stage, total: 0, verified: 0 };
        acc[stage].total += 1;
        if (doc.status === "verified") acc[stage].verified += 1;
        return acc;
      }, {}),
  );

  const { data: pendingUploads } = await supabase
    .from("pending_uploads")
    .select("id, zoho_file_name, zoho_uploaded_time")
    .eq("application_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const missingDocuments = currentStageDocuments
    .filter((doc) => doc.status === "missing")
    .map((doc) => ({ id: doc.id, item_name: doc.item_name }));

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, status")
    .eq("application_id", id)
    .order("due_date", { ascending: true });

  const { data: cbkCorrespondence } = await supabase
    .from("cbk_correspondence")
    .select("id, query_text, received_date, response_deadline, response_status, response_text")
    .eq("application_id", id)
    .order("received_date", { ascending: false });

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 px-6 py-8">
      <div className="animate-fade-in mx-auto max-w-4xl space-y-6">
        <div>
          <div className="flex items-baseline justify-between">
            <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand">
              ← Back to whiteboard
            </Link>
            <GuideMeButton steps={CASE_TOUR} label="Guide me through this case" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            {client && (
              <ClientNameEditor
                clientId={client.id}
                applicationId={id}
                companyName={client.company_name}
              />
            )}
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{application.completion_pct}% complete</span>
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${locked ? "text-green-700 dark:text-green-400" : "text-brand-dark dark:text-brand"}`}>
              {locked ? "Complete" : STAGE_LABEL[application.stage]}
            </p>
            <div className="flex items-center gap-2">
              <Link
                data-tour="visualize-progress"
                href={`/cases/${id}/progress`}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:border-brand hover:text-brand-dark dark:hover:text-brand"
              >
                Visualize progress
              </Link>
              {!locked && PREVIOUS_STAGE[application.stage] && (
                <BackStageButton applicationId={id} previousStage={PREVIOUS_STAGE[application.stage]!} />
              )}
              {!locked && application.stage === "stage_3" && <CompleteCaseButton applicationId={id} />}
            </div>
          </div>
          {client && (
            <div data-tour="workdrive-link" className="mt-3 space-y-1">
              <WorkdriveLinkEditor
                clientId={client.id}
                applicationId={id}
                initialUrl={client.workdrive_folder_url}
              />
              {client.workdrive_share_link && (
                <CopyLink label="Client upload link" url={client.workdrive_share_link} />
              )}
            </div>
          )}
        </div>

        <PendingUploads
          applicationId={id}
          uploads={pendingUploads ?? []}
          missingDocuments={missingDocuments}
          locked={locked}
        />

        <section data-tour="checklist">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Checklist</h2>
          <DocumentChecklist applicationId={id} documents={currentStageDocuments} locked={locked} />
        </section>

        {previousStages.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Previous stages</h2>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {previousStages.map((s) => (
                  <li key={s.stage} className="flex justify-between">
                    <span>{STAGE_LABEL[s.stage] ?? s.stage}</span>
                    <span>
                      {s.verified}/{s.total} verified
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section data-tour="tasks">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tasks</h2>
          <TaskList applicationId={id} tasks={tasks ?? []} locked={locked} />
        </section>

        <section data-tour="cbk-log">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">CBK correspondence</h2>
          <CbkLog applicationId={id} entries={cbkCorrespondence ?? []} locked={locked} />
        </section>

        {client && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
            <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Permanently delete this client and everything tied to their case.
              </p>
              <DeleteClientDialog clientId={client.id} companyName={client.company_name} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

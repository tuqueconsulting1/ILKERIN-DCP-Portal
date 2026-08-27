import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Manager Guide — Ilkerin DCP Portal",
  description: "A plain-language guide to using the DCP licensing case management app.",
};

const SECTIONS = [
  { id: "overview", label: "What this app does" },
  { id: "signing-in", label: "Signing in" },
  { id: "whiteboard", label: "The case whiteboard" },
  { id: "adding-a-client", label: "Adding a new client" },
  { id: "workdrive", label: "The client’s document folder" },
  { id: "checklist", label: "The checklist & verifying documents" },
  { id: "unmatched-uploads", label: "Unmatched uploads" },
  { id: "stages", label: "Stages, and moving back a stage" },
  { id: "tasks", label: "Tasks" },
  { id: "cbk", label: "CBK correspondence" },
  { id: "progress", label: "Visualizing progress" },
  { id: "completing", label: "Completing a case" },
  { id: "managing-client", label: "Renaming or deleting a client" },
  { id: "guide-me", label: "The “Guide me” walkthrough" },
  { id: "help", label: "Getting help" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-zinc-200 dark:border-zinc-700 pt-8 first:border-0 first:pt-0">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

export default function DocumentationPage() {
  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 px-6 py-8">
      <div className="mx-auto flex max-w-5xl gap-10">
        <nav className="sticky top-8 hidden h-fit w-56 shrink-0 lg:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            On this page
          </p>
          <ul className="space-y-1.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-zinc-500 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="animate-fade-in min-w-0 flex-1 space-y-8">
          <div>
            <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand">
              ← Back to the app
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Case Manager Guide</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              A plain-language walkthrough of the Ilkerin DCP Portal — no technical background
              needed. If you’d rather learn by clicking than reading, use the{" "}
              <strong>Guide me</strong> button inside the app instead (see the last section below).
            </p>
          </div>

          <Section id="overview" title="What this app does">
            <p>
              This app is where you track every client’s journey through the Central Bank of
              Kenya (CBK) Digital Credit Provider (DCP) licensing process, from start to finish.
              CBK’s process has three stages:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Stage 1</strong> — Approval of Name</li>
              <li><strong>Stage 2</strong> — Application for Licence</li>
              <li><strong>Stage 3</strong> — Data Submission &amp; Licensing</li>
            </ul>
            <p>
              Each stage has its own checklist of documents. The app tracks which documents are
              in, which are still missing, and moves a client to the next stage automatically once
              everything in the current stage is verified.
            </p>
            <p>
              Clients never log into this app. They only ever interact with a Zoho WorkDrive
              folder you share with them — everything else happens on your side.
            </p>
          </Section>

          <Section id="signing-in" title="Signing in">
            <ol className="list-decimal space-y-1 pl-5">
              <Step>Go to the app’s sign-in page and enter the email and password you were given.</Step>
              <Step>
                If you forget your password or don’t have an account yet, contact whoever set up
                the app for your team (see “Getting help” below).
              </Step>
            </ol>
          </Section>

          <Section id="whiteboard" title="The case whiteboard">
            <p>
              After signing in, you land on the <strong>whiteboard</strong> — a live view of every
              client’s case. There are two ways to look at it:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Board view</strong> — clients are grouped into columns by stage, like sticky
                notes on a board. This is the default.
              </li>
              <li>
                <strong>List view</strong> — the same clients as rows in a table, useful when you
                want to scan everyone at once.
              </li>
            </ul>
            <p>Switch between them with the toggle near the top of the page.</p>
            <p>
              Each client’s card or row shows a progress bar and small colored badges when
              something needs attention — an overdue task, a document about to expire, or a CBK
              query waiting on a response. Click a client’s name to open their case.
            </p>
          </Section>

          <Section id="adding-a-client" title="Adding a new client">
            <ol className="list-decimal space-y-1 pl-5">
              <Step>Click <strong>+ Add client</strong> at the top of the whiteboard.</Step>
              <Step>Enter the company name.</Step>
              <Step>
                Choose the stage they’re starting at. Most clients start at Stage 1, but if a
                client already completed some stages before this app existed, you can start them
                further along — the checklist for that stage is created automatically either way.
              </Step>
              <Step>
                If the client already has a Zoho WorkDrive folder from before, paste its link in
                the WorkDrive field. If they’re brand new, leave it blank — a folder is created for
                them automatically, along with a link you can send them to upload documents.
              </Step>
              <Step>Click <strong>Add client</strong>. They’ll appear on the whiteboard right away.</Step>
            </ol>
          </Section>

          <Section id="workdrive" title="The client’s document folder">
            <p>
              Every client has a WorkDrive folder where they drop their documents — they never
              need an account or login for this. On a client’s case page you’ll see:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Open WorkDrive folder</strong> — opens the folder for you to look through
                yourself.
              </li>
              <li>
                <strong>Client upload link</strong> — the link to copy and send to the client so
                they can upload their documents. It only lets them upload, not see anyone else’s
                files.
              </li>
            </ul>
            <p>
              If a client’s folder wasn’t linked yet, click <strong>Link folder</strong> and paste
              in the WorkDrive folder link.
            </p>
          </Section>

          <Section id="checklist" title="The checklist & verifying documents">
            <p>
              Every case has a checklist for its current stage — each row is a document the client
              or your team needs to provide. Each item shows who owns it (client, Ilkerin, or
              joint), its current status, and an expiry date if it has one (like a CRB report,
              which is only valid for a set number of months).
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Mark received</strong> — use this once a document has come in but you
                haven’t reviewed it yet.
              </li>
              <li>
                <strong>The Verified checkbox</strong> — tick it once you’ve checked a document and
                it’s good. This is the main action you’ll use most often — it’s quick, and it
                updates instantly.
              </li>
              <li>
                <strong>Reject</strong> — use this if something came in but isn’t acceptable (wrong
                document, expired, etc.).
              </li>
            </ul>
            <p>
              Once every item in the current stage is verified, the case moves to the next stage
              on its own — you don’t need to do anything extra.
            </p>
          </Section>

          <Section id="unmatched-uploads" title="Unmatched uploads">
            <p>
              When a client drops a file into their WorkDrive folder, the app notices it and lists
              it under <strong>Unmatched uploads</strong> at the top of the case page. Since the
              app can’t always tell which checklist item a file is meant for just from its name,
              you confirm it yourself:
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <Step>Pick the matching checklist item from the dropdown next to the file.</Step>
              <Step>Click <strong>Match</strong> — the checklist item flips to “received” automatically.</Step>
              <Step>
                If a file doesn’t belong to any checklist item (a duplicate, or sent by mistake),
                click <strong>Ignore</strong> instead.
              </Step>
            </ol>
            <p>
              It can take a little while (up to a day) for a fresh upload to show up here, since
              the app checks WorkDrive on a schedule rather than instantly.
            </p>
          </Section>

          <Section id="stages" title="Stages, and moving back a stage">
            <p>
              Stages advance automatically — once every checklist item for the current stage is
              verified, the case moves forward and the next stage’s checklist appears.
            </p>
            <p>
              If something needs to be redone (say CBK bounces the application back, or an item
              was verified by mistake), use <strong>← Back to Stage X</strong> on the case page.
              This sends the case back a stage and resets that stage’s checklist so it can be
              properly re-verified — it doesn’t delete anything, it just asks for a fresh check.
            </p>
          </Section>

          <Section id="tasks" title="Tasks">
            <p>
              Use the Tasks section on a case page for anything you need to follow up on that
              isn’t a document — a phone call, an internal reminder, anything with a due date.
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <Step>Type the task, optionally pick a due date, and click <strong>Add</strong>.</Step>
              <Step>Tick it off once it’s done — it stays visible with a line through it.</Step>
            </ol>
          </Section>

          <Section id="cbk" title="CBK correspondence">
            <p>Use this to keep a record of anything CBK asks about a client’s application.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <Step>
                Click into the CBK correspondence box, type what CBK asked, and set when it was
                received and when a response is due.
              </Step>
              <Step>
                Submitting it automatically creates a matching task with that response deadline, so
                it also shows up in your task list.
              </Step>
              <Step>
                Once you’ve replied to CBK, click <strong>Mark responded</strong> and enter a short
                summary of your response. The linked task closes automatically.
              </Step>
            </ol>
          </Section>

          <Section id="progress" title="Visualizing progress">
            <p>
              Click <strong>Visualize progress</strong> on a client’s card or case page for a
              quick-glance view: three rings (one per stage) showing how much of each is done, an
              overall percentage, and a list of what’s still outstanding — remaining checklist
              items and open tasks, all in one place.
            </p>
          </Section>

          <Section id="completing" title="Completing a case">
            <p>
              Once a client reaches Stage 3 and their licence is actually issued by CBK, open their
              case and click <strong>Licence received — Complete case</strong>. This is a
              deliberate action you take yourself — the app won’t do it automatically, since it’s a
              real-world event only you know has happened.
            </p>
            <p>
              A completed case moves to the “Complete” column on the whiteboard and locks its
              checklist, tasks, and CBK log from further changes, keeping a clean record of the
              finished case.
            </p>
          </Section>

          <Section id="managing-client" title="Renaming or deleting a client">
            <p>
              To fix a client’s name, click <strong>Edit</strong> next to it on their case page,
              type the correction, and save.
            </p>
            <p>
              To remove a client entirely, scroll to the red <strong>Danger zone</strong> at the
              bottom of their case page and click <strong>Delete client</strong>. This permanently
              removes the client and everything tied to their case — there’s no undo, so as a
              safeguard you’ll need to type the exact phrase shown (e.g.{" "}
              <code className="rounded bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 text-xs">delete Acme Ltd</code>)
              before the delete button will work.
            </p>
          </Section>

          <Section id="guide-me" title="The “Guide me” walkthrough">
            <p>
              If you’d rather be shown around than read about it, click the{" "}
              <strong>✨ Guide me</strong> button on the whiteboard, or{" "}
              <strong>✨ Guide me through this case</strong> on a case page. It highlights each
              part of the screen one at a time with a short explanation — use <strong>Next</strong>{" "}
              / <strong>Back</strong> to move through it, or <strong>Skip tour</strong> to close it
              anytime.
            </p>
          </Section>

          <Section id="help" title="Getting help">
            <p>
              If something in the app looks wrong, or you’re stuck, reach out to whoever manages
              this system for Ilkerin Consulting rather than trying to fix data yourself —
              especially anything involving deleting a client or a document, since those can’t be
              undone from within the app.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDocumentStatus } from "@/app/actions/documents";
import { reorderChecklistTemplates } from "@/app/actions/checklist-templates";

export type ChecklistDocument = {
  id: string;
  status: string;
  owner_tag: string;
  expiry_date: string | null;
  item_name: string;
  checklistTemplateId: string;
  category: string | null;
  subcategory: string | null;
  docType: string | null;
  form: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  missing: "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400",
  received: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
  verified: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  expired: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

type DocGroup = {
  key: string;
  category: string | null;
  subcategory: string | null;
  items: ChecklistDocument[];
};

// Docs arrive pre-sorted by sort_order, which already nests category ->
// subcategory -> item contiguously (see migration 0018), so a single pass
// grouping adjacent same-category/subcategory runs is enough - no re-sort
// needed here.
function groupDocuments(docs: ChecklistDocument[]): DocGroup[] {
  const groups: DocGroup[] = [];
  for (const doc of docs) {
    const key = `${doc.category ?? ""}::${doc.subcategory ?? ""}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(doc);
    } else {
      groups.push({ key, category: doc.category, subcategory: doc.subcategory, items: [doc] });
    }
  }
  return groups;
}

export function DocumentChecklist({
  applicationId,
  documents,
  locked = false,
}: {
  applicationId: string;
  documents: ChecklistDocument[];
  locked?: boolean;
}) {
  // Optimistic local copy: the checkbox/buttons update this instantly, while
  // the server write and the resulting stage/completion recalculation happen
  // in the background - no waiting on a full page refresh to see the click
  // register. Re-synced whenever the server sends fresh props (e.g. after
  // the background refresh below lands, or on a real page navigation).
  const [localDocs, setLocalDocs] = useState(documents);
  const [prevDocuments, setPrevDocuments] = useState(documents);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const router = useRouter();

  // Re-sync from fresh server props (e.g. once the background refresh below
  // lands) without an effect - see https://react.dev/learn/you-might-not-need-an-effect
  if (documents !== prevDocuments) {
    setPrevDocuments(documents);
    setLocalDocs(documents);
  }

  function moveDoc(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const source = localDocs.find((d) => d.id === sourceId);
    const target = localDocs.find((d) => d.id === targetId);
    if (!source || !target) return;
    // Dragging is only meaningful within the same category/subcategory
    // section now that items are visually grouped - ignore cross-group drops.
    if (source.category !== target.category || source.subcategory !== target.subcategory) return;

    const previousOrder = localDocs;
    const next = [...localDocs];
    const sourceIndex = next.findIndex((d) => d.id === sourceId);
    const targetIndex = next.findIndex((d) => d.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);

    setLocalDocs(next);
    setReorderError(null);

    // Checklist order lives on the shared checklist_templates row (see
    // 0014), so this persists for every application at this stage, not just
    // this one - reorder writes are compliance/admin-only via RLS.
    reorderChecklistTemplates(
      applicationId,
      next.map((d) => d.checklistTemplateId),
    ).then((result) => {
      if (result?.error) {
        setLocalDocs(previousOrder);
        setReorderError(result.error);
      }
    });
  }

  function setStatus(documentId: string, status: string) {
    const previous = localDocs.find((d) => d.id === documentId)?.status;

    setLocalDocs((docs) => docs.map((d) => (d.id === documentId ? { ...d, status } : d)));
    setErrors((e) => ({ ...e, [documentId]: "" }));

    updateDocumentStatus(documentId, applicationId, status).then((result) => {
      if (result?.error) {
        setLocalDocs((docs) =>
          docs.map((d) => (d.id === documentId ? { ...d, status: previous ?? d.status } : d)),
        );
        setErrors((e) => ({ ...e, [documentId]: result.error! }));
        return;
      }
      // Non-blocking: refreshes the page's server-derived numbers (stage
      // label, overall completion %) once the write lands, without making
      // the checkbox itself wait on it.
      router.refresh();
    });
  }

  function renderRow(doc: ChecklistDocument) {
    return (
      <tr
        key={doc.id}
        onDragOver={(e) => {
          if (locked) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (locked || !dragId) return;
          e.preventDefault();
          moveDoc(dragId, doc.id);
          setDragId(null);
        }}
        className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${dragId === doc.id ? "opacity-50" : ""}`}
      >
        <td className="px-2 py-3 text-center">
          {!locked && (
            <span
              draggable
              onDragStart={() => setDragId(doc.id)}
              onDragEnd={() => setDragId(null)}
              role="button"
              aria-label={`Drag to reorder ${doc.item_name}`}
              title="Drag to reorder"
              className="inline-block cursor-grab select-none text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 active:cursor-grabbing"
            >
              ⠿
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
          {doc.item_name}
          {(doc.form || doc.docType) && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {doc.form && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  {doc.form}
                </span>
              )}
              {doc.docType && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  {doc.docType}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 capitalize">{doc.owner_tag}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize transition-colors ${STATUS_STYLE[doc.status] ?? "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"}`}
          >
            {doc.status}
          </span>
        </td>
        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{doc.expiry_date ?? "-"}</td>
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={doc.status === "verified"}
            disabled={locked}
            onChange={() => setStatus(doc.id, doc.status === "verified" ? "received" : "verified")}
            className="h-4 w-4 accent-brand disabled:opacity-50"
            aria-label={`Mark ${doc.item_name} as verified`}
          />
        </td>
        <td className="px-4 py-3">
          {locked ? (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Locked</span>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                {doc.status !== "received" && doc.status !== "verified" && (
                  <button
                    onClick={() => setStatus(doc.id, "received")}
                    className="text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand"
                  >
                    Mark received
                  </button>
                )}
                {doc.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(doc.id, "rejected")}
                    className="text-xs font-medium text-red-600 dark:text-red-400 transition-colors hover:text-red-800 dark:hover:text-red-400"
                  >
                    Reject
                  </button>
                )}
              </div>
              {errors[doc.id] && (
                <span className="animate-fade-in text-xs text-red-600 dark:text-red-400">{errors[doc.id]}</span>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  }

  function renderTable(items: ChecklistDocument[]) {
    return (
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
          <tr>
            <th className="w-6 px-2 py-2" aria-hidden="true"></th>
            <th className="px-4 py-2 font-medium">Item</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Expiry</th>
            <th className="px-4 py-2 font-medium">Verified</th>
            <th className="px-4 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">{items.map(renderRow)}</tbody>
      </table>
    );
  }

  if (localDocs.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No checklist items for this application.
      </div>
    );
  }

  const groups = groupDocuments(localDocs);
  const ungrouped = groups.length === 1 && groups[0].category === null;

  return (
    <div className="space-y-3">
      {reorderError && (
        <p className="animate-fade-in rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-xs text-red-600 dark:text-red-400">
          Couldn&apos;t save the new order: {reorderError}
        </p>
      )}

      {ungrouped ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          {renderTable(groups[0].items)}
        </div>
      ) : (
        groups.map((group) => (
          <details
            key={group.key}
            open
            className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          >
            <summary className="cursor-pointer select-none bg-zinc-50 dark:bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {group.category}
              {group.subcategory && (
                <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">- {group.subcategory}</span>
              )}
            </summary>
            {renderTable(group.items)}
          </details>
        ))
      )}
    </div>
  );
}

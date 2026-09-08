"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Persists a new display order for a stage's checklist items. This edits
 * checklist_templates directly, so the new order applies to every
 * application at that stage, not just the one the drag happened on — RLS
 * already restricts this write to compliance/admin (see 0002).
 */
export async function reorderChecklistTemplates(
  applicationId: string,
  orderedTemplateIds: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const results = await Promise.all(
    orderedTemplateIds.map((templateId, index) =>
      supabase
        .from("checklist_templates")
        .update({ sort_order: index + 1 })
        .eq("id", templateId),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { error: failed.error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  return { success: true };
}

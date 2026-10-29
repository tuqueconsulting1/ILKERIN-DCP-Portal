"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logDocumentReceivedNotification } from "@/lib/notifications";

const VALID_STATUSES = new Set(["missing", "received", "verified", "rejected"]);

export async function updateDocumentStatus(
  documentId: string,
  applicationId: string,
  status: string,
) {
  if (!VALID_STATUSES.has(status)) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const update: Record<string, unknown> = { status };
  if (status === "verified") {
    update.verified_by = user.id;
    update.verified_at = new Date().toISOString();
  }

  const { error } = await supabase.from("documents").update(update).eq("id", documentId);

  if (error) {
    return { error: error.message };
  }

  if (status === "received") {
    await logDocumentReceivedNotification(supabase, documentId, applicationId);
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/ndtcp");
  return { success: true };
}

export async function updateDocumentNotes(documentId: string, applicationId: string, notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const trimmed = notes.trim();
  const { error } = await supabase
    .from("documents")
    .update({
      notes: trimmed || null,
      notes_updated_by: trimmed ? user.id : null,
      notes_updated_at: trimmed ? new Date().toISOString() : null,
    })
    .eq("id", documentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logDocumentReceivedNotification } from "@/lib/notifications";

export async function matchPendingUpload(
  pendingUploadId: string,
  documentId: string,
  applicationId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: pendingUpload, error: pendingErr } = await supabase
    .from("pending_uploads")
    .select("zoho_file_id, zoho_file_url, zoho_uploaded_time")
    .eq("id", pendingUploadId)
    .single();

  if (pendingErr || !pendingUpload) {
    return { error: pendingErr?.message ?? "Pending upload not found." };
  }

  const { error: docErr } = await supabase
    .from("documents")
    .update({
      status: "received",
      zoho_file_id: pendingUpload.zoho_file_id,
      zoho_file_url: pendingUpload.zoho_file_url,
      uploaded_at: pendingUpload.zoho_uploaded_time ?? new Date().toISOString(),
    })
    .eq("id", documentId);

  if (docErr) {
    return { error: docErr.message };
  }

  const { error: pendingUpdateErr } = await supabase
    .from("pending_uploads")
    .update({ status: "matched", matched_document_id: documentId })
    .eq("id", pendingUploadId);

  if (pendingUpdateErr) {
    return { error: pendingUpdateErr.message };
  }

  await logDocumentReceivedNotification(supabase, documentId, applicationId);

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}

export async function ignorePendingUpload(pendingUploadId: string, applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("pending_uploads")
    .update({ status: "ignored" })
    .eq("id", pendingUploadId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  return { success: true };
}

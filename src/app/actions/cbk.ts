"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractFolderIdFromUrl, uploadFileToWorkdrive } from "@/lib/zoho";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_MB } from "@/lib/attachments";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves the WorkDrive folder a CBK correspondence attachment for this
 * application should land in -- the client's root folder, same place the
 * cron job's polling logic resolves a folder id from (zoho_workdrive_folder_id
 * first, falling back to parsing the share URL).
 */
async function resolveClientFolderId(supabase: SupabaseClient<any, any, any>, applicationId: string) {
  const { data } = await supabase
    .from("applications")
    .select("client:clients(zoho_workdrive_folder_id, workdrive_folder_url)")
    .eq("id", applicationId)
    .single();

  const client = Array.isArray(data?.client) ? data.client[0] : data?.client;
  return client?.zoho_workdrive_folder_id || extractFolderIdFromUrl(client?.workdrive_folder_url ?? null);
}

async function uploadAttachment(
  supabase: SupabaseClient<any, any, any>,
  applicationId: string,
  file: File | null,
) {
  if (!file || file.size === 0) return { attachment: null } as const;

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: `That file is too large -- attachments are limited to ${MAX_ATTACHMENT_MB}MB.` } as const;
  }

  const folderId = await resolveClientFolderId(supabase, applicationId);
  if (!folderId) {
    return { error: "Couldn't attach the file: this client has no WorkDrive folder linked yet." } as const;
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await uploadFileToWorkdrive(folderId, {
      name: file.name,
      type: file.type,
      buffer,
    });
    return { attachment } as const;
  } catch (err) {
    return { error: `Couldn't upload the attachment: ${(err as Error).message}` } as const;
  }
}

export async function logCbkQuery(applicationId: string, formData: FormData) {
  const queryText = String(formData.get("queryText") ?? "").trim();
  const receivedDate = String(formData.get("receivedDate") ?? "").trim();
  const responseDeadline = String(formData.get("responseDeadline") ?? "").trim();
  const queryFile = formData.get("queryFile") as File | null;

  if (!queryText) {
    return { error: "Query text is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const uploadResult = await uploadAttachment(supabase, applicationId, queryFile);
  if ("error" in uploadResult) {
    return { error: uploadResult.error };
  }
  const attachment = uploadResult.attachment;

  const { data: correspondence, error: correspondenceErr } = await supabase
    .from("cbk_correspondence")
    .insert({
      application_id: applicationId,
      query_text: queryText,
      received_date: receivedDate || undefined,
      response_deadline: responseDeadline || null,
      query_zoho_file_id: attachment?.fileId ?? null,
      query_zoho_file_url: attachment?.url ?? null,
      query_zoho_file_name: attachment?.fileName ?? null,
    })
    .select("id")
    .single();

  if (correspondenceErr) {
    return { error: correspondenceErr.message };
  }

  // Per the automation rule in PLAN.md: a CBK query received creates a task
  // with the response deadline as its due date.
  const { error: taskErr } = await supabase.from("tasks").insert({
    application_id: applicationId,
    title: `Respond to CBK query: ${queryText.slice(0, 80)}`,
    due_date: responseDeadline || null,
    owner_id: user.id,
    linked_entity_type: "cbk_correspondence",
    linked_entity_id: correspondence.id,
  });

  if (taskErr) {
    return { error: `Query logged, but the linked task could not be created: ${taskErr.message}` };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}

export async function markCbkResponded(
  correspondenceId: string,
  applicationId: string,
  formData: FormData,
) {
  const responseText = String(formData.get("responseText") ?? "").trim();
  const responseFile = formData.get("responseFile") as File | null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const uploadResult = await uploadAttachment(supabase, applicationId, responseFile);
  if ("error" in uploadResult) {
    return { error: uploadResult.error };
  }
  const attachment = uploadResult.attachment;

  const { error } = await supabase
    .from("cbk_correspondence")
    .update({
      response_status: "responded",
      response_text: responseText,
      response_zoho_file_id: attachment?.fileId ?? null,
      response_zoho_file_url: attachment?.url ?? null,
      response_zoho_file_name: attachment?.fileName ?? null,
    })
    .eq("id", correspondenceId);

  if (error) {
    return { error: error.message };
  }

  // Close the linked task, if one exists.
  await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("linked_entity_type", "cbk_correspondence")
    .eq("linked_entity_id", correspondenceId);

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractFolderIdFromUrl, listFolderFiles } from "@/lib/zoho";

/**
 * Polls every active application's WorkDrive folder for files the app
 * hasn't seen yet, and queues them as pending_uploads for a case manager to
 * match to a checklist item. Fallback/primary detection mechanism until a
 * webhook receiver is added — see MILESTONES.md Phase 2.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: applications, error: appsError } = await supabase
    .from("applications")
    .select(
      "id, stage, client:clients(workdrive_folder_url, zoho_workdrive_folder_id, workdrive_stage1_folder_id, workdrive_stage2_folder_id, workdrive_stage3_folder_id)",
    )
    .eq("status", "active");

  if (appsError) {
    return NextResponse.json({ error: appsError.message }, { status: 500 });
  }

  const STAGE_FOLDER_KEY = {
    stage_1: "workdrive_stage1_folder_id",
    stage_2: "workdrive_stage2_folder_id",
    stage_3: "workdrive_stage3_folder_id",
  } as const;

  const results: Array<{ applicationId: string; queued: number; skipped?: string }> = [];

  for (const application of applications ?? []) {
    const client = Array.isArray(application.client) ? application.client[0] : application.client;
    const folderId = client?.zoho_workdrive_folder_id || extractFolderIdFromUrl(client?.workdrive_folder_url ?? null);

    if (!folderId) {
      results.push({ applicationId: application.id, queued: 0, skipped: "no resolvable folder id" });
      continue;
    }

    // Check both the root folder (clients who drop files flat) and the
    // subfolder for the application's current stage (clients organized by
    // stage), so neither habit is missed.
    const stageFolderKey = STAGE_FOLDER_KEY[application.stage as keyof typeof STAGE_FOLDER_KEY];
    const stageFolderId = stageFolderKey ? (client?.[stageFolderKey] as string | null) : null;
    const foldersToCheck = [folderId, ...(stageFolderId && stageFolderId !== folderId ? [stageFolderId] : [])];

    let files;
    try {
      const fileLists = await Promise.all(foldersToCheck.map((id) => listFolderFiles(id)));
      const seen = new Set<string>();
      files = fileLists.flat().filter((f) => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
    } catch (err) {
      results.push({
        applicationId: application.id,
        queued: 0,
        skipped: `Zoho error: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    if (files.length === 0) {
      results.push({ applicationId: application.id, queued: 0 });
      continue;
    }

    const { data: knownDocuments } = await supabase
      .from("documents")
      .select("zoho_file_id")
      .eq("application_id", application.id)
      .not("zoho_file_id", "is", null);

    const { data: knownPending } = await supabase
      .from("pending_uploads")
      .select("zoho_file_id")
      .eq("application_id", application.id);

    const knownFileIds = new Set([
      ...(knownDocuments ?? []).map((d) => d.zoho_file_id as string),
      ...(knownPending ?? []).map((p) => p.zoho_file_id as string),
    ]);

    const newFiles = files.filter((f) => !knownFileIds.has(f.id));

    if (newFiles.length > 0) {
      const { error: insertError } = await supabase.from("pending_uploads").insert(
        newFiles.map((f) => ({
          application_id: application.id,
          zoho_file_id: f.id,
          zoho_file_name: f.name,
          zoho_file_url: f.url,
          zoho_uploaded_time: f.uploadedTime,
        })),
      );

      if (insertError) {
        results.push({ applicationId: application.id, queued: 0, skipped: insertError.message });
        continue;
      }
    }

    results.push({ applicationId: application.id, queued: newFiles.length });
  }

  return NextResponse.json({ polled: results.length, results });
}

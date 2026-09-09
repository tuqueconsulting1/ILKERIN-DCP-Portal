"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeCase(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: application, error: fetchErr } = await supabase
    .from("applications")
    .select("stage")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !application) {
    return { error: fetchErr?.message ?? "Application not found." };
  }

  if (application.stage !== "stage_3") {
    return { error: "Only a Stage 3 case can be marked complete." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "complete" })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}

const PREVIOUS_STAGE: Record<string, string | undefined> = {
  stage_2: "stage_1",
  stage_3: "stage_2",
};

export async function moveToPreviousStage(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: application, error: fetchErr } = await supabase
    .from("applications")
    .select("stage, status")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !application) {
    return { error: fetchErr?.message ?? "Application not found." };
  }

  if (application.status !== "active") {
    return { error: "Only an active case can move back a stage." };
  }

  const previousStage = PREVIOUS_STAGE[application.stage];
  if (!previousStage) {
    return { error: "Already at the first stage." };
  }

  const { error: stageErr } = await supabase
    .from("applications")
    .update({ stage: previousStage })
    .eq("id", applicationId);

  if (stageErr) {
    return { error: stageErr.message };
  }

  // Reset the stage being returned to so it requires fresh verification -
  // otherwise its items are still all "verified" from before, and the
  // auto-advance trigger would immediately send the case forward again on
  // the next document event.
  const { data: templates, error: templatesErr } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("stage", previousStage);

  if (templatesErr) {
    return { error: templatesErr.message };
  }

  const templateIds = (templates ?? []).map((t) => t.id);

  if (templateIds.length > 0) {
    const { error: resetErr } = await supabase
      .from("documents")
      .update({ status: "missing", zoho_file_id: null, zoho_file_url: null, verified_by: null, verified_at: null })
      .eq("application_id", applicationId)
      .in("checklist_template_id", templateIds);

    if (resetErr) {
      return { error: resetErr.message };
    }
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}

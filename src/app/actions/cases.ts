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

const NEXT_STAGE: Record<string, "stage_2" | "stage_3" | undefined> = {
  stage_1: "stage_2",
  stage_2: "stage_3",
};

// Manual override for the auto-advance trigger (0008-0010), which only ever
// moves a stage forward once every one of its checklist items is verified.
// This lets a case manager force the move early. Outstanding items in the
// stage being left are deliberately NOT deleted or reset - they stay as
// `documents` rows against their original stage, which the case detail
// page's existing "Previous stages" section already surfaces as
// "N/M verified" with no extra column or query needed.
export async function forceAdvanceStage(applicationId: string) {
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
    return { error: "Only an active case can be advanced." };
  }

  const nextStage = NEXT_STAGE[application.stage];
  if (!nextStage) {
    return {
      error: 'Stage 3 has no next stage - use "Licence received" to complete the case instead.',
    };
  }

  const { error: stageErr } = await supabase
    .from("applications")
    .update({ stage: nextStage })
    .eq("id", applicationId);

  if (stageErr) {
    return { error: stageErr.message };
  }

  // Seed the next stage's checklist - same idempotent shape as the
  // auto-advance trigger (0009): skip any template that already has a
  // document row for this application (e.g. an earlier back-then-forward
  // cycle), so re-advancing never creates duplicates.
  const { data: templates, error: templatesErr } = await supabase
    .from("checklist_templates")
    .select("id, owner_tag")
    .eq("stage", nextStage)
    .eq("is_active", true);

  if (templatesErr) {
    return { error: templatesErr.message };
  }

  const { data: existingDocs, error: existingErr } = await supabase
    .from("documents")
    .select("checklist_template_id")
    .eq("application_id", applicationId);

  if (existingErr) {
    return { error: existingErr.message };
  }

  const existingTemplateIds = new Set((existingDocs ?? []).map((d) => d.checklist_template_id));
  const toInsert = (templates ?? [])
    .filter((t) => !existingTemplateIds.has(t.id))
    .map((t) => ({
      application_id: applicationId,
      checklist_template_id: t.id,
      owner_tag: t.owner_tag,
      status: "missing" as const,
    }));

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("documents").insert(toInsert);
    if (insertErr) {
      return { error: insertErr.message };
    }
  }

  // The documents insert trigger recalculates completion_pct as a side
  // effect - but only when rows actually get inserted. If every template
  // already had a document row (toInsert empty, e.g. re-advancing after a
  // back-then-forward cycle), nothing fires and completion_pct would be
  // left stuck at the previous stage's value - the exact gap 0010 fixed for
  // the trigger's own code path. Recalculate explicitly here too.
  const { data: nextStageDocs, error: countErr } = await supabase
    .from("documents")
    .select("status, checklist_template:checklist_templates!inner(stage)")
    .eq("application_id", applicationId)
    .eq("checklist_template.stage", nextStage);

  if (countErr) {
    return { error: countErr.message };
  }

  const total = nextStageDocs?.length ?? 0;
  const verified = (nextStageDocs ?? []).filter((d) => d.status === "verified").length;
  const completionPct = total === 0 ? 0 : Math.round((100 * verified) / total);

  const { error: pctErr } = await supabase
    .from("applications")
    .update({ completion_pct: completionPct })
    .eq("id", applicationId);

  if (pctErr) {
    return { error: pctErr.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}

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

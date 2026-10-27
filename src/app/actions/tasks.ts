"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTask(applicationId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();

  if (!title) {
    return { error: "Task title is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.from("tasks").insert({
    application_id: applicationId,
    title,
    due_date: dueDate || null,
    owner_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/ndtcp");
  return { success: true };
}

export async function setTaskStatus(taskId: string, applicationId: string, status: "open" | "done") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/ndtcp");
  return { success: true };
}

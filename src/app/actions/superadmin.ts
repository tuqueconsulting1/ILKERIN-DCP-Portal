"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireSuperAdmin(supabase: SupabaseClient<any, any, any>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) {
    return { error: "Not authorized." } as const;
  }

  return { user } as const;
}

export async function addZohoAllowedEmail(email: string) {
  const supabase = await createClient();
  const check = await requireSuperAdmin(supabase);
  if ("error" in check) return check;

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const { error } = await supabase
    .from("zoho_allowed_emails")
    .insert({ email: normalized, added_by: check.user.id });

  if (error) {
    return { error: error.code === "23505" ? "That email is already on the list." : error.message };
  }

  revalidatePath("/superadmin");
  return { success: true };
}

export async function removeZohoAllowedEmail(email: string) {
  const supabase = await createClient();
  const check = await requireSuperAdmin(supabase);
  if ("error" in check) return check;

  const { error } = await supabase.from("zoho_allowed_emails").delete().eq("email", email);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/superadmin");
  return { success: true };
}

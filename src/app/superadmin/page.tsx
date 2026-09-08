import { createClient } from "@/lib/supabase/server";
import { SuperAdminLoginForm } from "@/components/superadmin-login-form";
import { SuperAdminDashboard } from "@/components/superadmin-dashboard";
import { SignOutButton } from "@/components/sign-out-button";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <SuperAdminLoginForm />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 dark:bg-zinc-950 px-4 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This account isn&apos;t a super admin.
        </p>
        <SignOutButton />
      </div>
    );
  }

  const { data: allowedEmails } = await supabase
    .from("zoho_allowed_emails")
    .select("email, created_at")
    .order("created_at", { ascending: false });

  return <SuperAdminDashboard initialEmails={allowedEmails ?? []} />;
}

"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      data-tour="sign-out"
      onClick={handleSignOut}
      className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-brand-dark dark:hover:text-brand"
    >
      Sign out
    </button>
  );
}

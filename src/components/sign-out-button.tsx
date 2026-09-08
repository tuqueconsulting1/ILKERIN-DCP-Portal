"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation, not router.replace/refresh -- see the same fix on
    // /login for why that pairing can silently drop the redirect.
    window.location.href = "/login";
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

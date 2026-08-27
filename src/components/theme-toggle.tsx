"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "ilkerin-dcp-theme";

/** Inline, blocking script injected in <head> so the theme class is set
 * before first paint — avoids a flash of the wrong theme on load. Reads
 * localStorage only; never auto-follows OS preference (see globals.css). */
export const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem(${JSON.stringify(THEME_KEY)});
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export function ThemeToggle() {
  // Starts "light" to match the server-rendered HTML (document isn't
  // available during SSR), then syncs to whatever the blocking script
  // above already applied to <html> before this component ever mounted —
  // the actual dark-mode styling doesn't depend on this state at all
  // (that's driven by the "dark" class directly), this is only for the
  // button's own icon.
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    function syncFromDom() {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
    syncFromDom();
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore (private browsing, storage disabled, etc.)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="text-sm text-white/70 transition-colors hover:text-white"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

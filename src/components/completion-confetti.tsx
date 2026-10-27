"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CompletionConfetti() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const completed = searchParams.get("completed");

  useEffect(() => {
    if (!completed) return;

    let cancelled = false;

    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f85814", "#212629", "#ffffff"],
      });
    });

    router.replace("/ndtcp");

    return () => {
      cancelled = true;
    };
  }, [completed, router]);

  return null;
}

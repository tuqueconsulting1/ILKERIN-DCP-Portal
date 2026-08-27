"use client";

import { useEffect, useState } from "react";

export type TourStep = {
  selector: string;
  title: string;
  body: string;
};

function useTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function update() {
      if (!selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(selector);
      setRect(el ? el.getBoundingClientRect() : null);
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const interval = setInterval(update, 300);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearInterval(interval);
    };
  }, [selector]);

  return rect;
}

function tooltipStyle(rect: DOMRect | null): React.CSSProperties {
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const width = 288;
  const spaceBelow = window.innerHeight - rect.bottom;
  const left = Math.min(Math.max(rect.left, 16), window.innerWidth - width - 16);

  if (spaceBelow > 220) {
    return { top: rect.bottom + 12, left };
  }

  return { top: Math.max(rect.top - 170, 16), left };
}

export function GuideMeButton({ steps, label = "Guide me" }: { steps: TourStep[]; label?: string }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const step = active ? steps[index] : null;
  const rect = useTargetRect(step?.selector ?? null);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  function start() {
    setIndex(0);
    setActive(true);
  }

  function next() {
    if (index < steps.length - 1) {
      setIndex(index + 1);
    } else {
      setActive(false);
    }
  }

  function back() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <>
      <button
        onClick={start}
        className="rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:border-brand hover:text-brand-dark dark:hover:text-brand"
      >
        ✨ {label}
      </button>

      {active && step && (
        <div className="fixed inset-0 z-[100]">
          {rect ? (
            <div
              className="pointer-events-none fixed rounded-md transition-all duration-200"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
              }}
            />
          ) : (
            <div className="fixed inset-0 bg-black/60" />
          )}

          <div
            className="animate-scale-in fixed z-[101] w-72 rounded-lg bg-white dark:bg-zinc-800 p-4 shadow-xl"
            style={tooltipStyle(rect)}
          >
            <p className="text-xs font-medium text-brand">
              Step {index + 1} of {steps.length}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{step.body}</p>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setActive(false)}
                className="text-xs text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Skip tour
              </button>
              <div className="flex gap-2">
                {index > 0 && (
                  <button
                    onClick={back}
                    className="rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  className="rounded-md bg-brand-dark px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90"
                >
                  {index === steps.length - 1 ? "Done" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

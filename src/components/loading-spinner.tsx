"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";

export function LoadingSpinner() {
  const reduceMotion = useReducedMotion();
  return (
    <m.span className="inline-flex shrink-0" aria-hidden="true" animate={{ rotate: reduceMotion ? 0 : 360 }}
      transition={{ duration: 0.9, repeat: reduceMotion ? 0 : Infinity, ease: "linear" }}>
      <LoaderCircle className="size-4" />
    </m.span>
  );
}

export function LoadingState({ children }: { children: ReactNode }) {
  return <div role="status" className="flex min-h-48 w-full flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center text-sm text-ink-muted">
    <LoadingSpinner />
    <span>{children}</span>
  </div>;
}

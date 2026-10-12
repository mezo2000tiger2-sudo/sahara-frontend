"use client";

import { LoaderCircle } from "lucide-react";
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

"use client";

import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function ProfileEntrance({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <m.div
      className="mx-auto w-full max-w-4xl"
      initial={false}
      animate={reducedMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1], y: [6, 0] }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
    >
      {children}
    </m.div>
  );
}

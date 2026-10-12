"use client";

import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Content is visible in server HTML; Motion enhances it when it enters view. */
export function Reveal({ children, className, delay = 0 }: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      className={className}
      initial={false}
      whileInView={reduceMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1], y: [16, 0] }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

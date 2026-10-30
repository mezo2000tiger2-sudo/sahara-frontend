"use client";

import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function HomeLetter({ children, className }: { children: ReactNode; className: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      className={className}
      initial={false}
      whileInView={reduceMotion
        ? { y: "0%", rotate: 3 }
        : { y: ["65%", "65%", "0%"], rotate: [-5, -5, 3] }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduceMotion ? 0 : 1.6, times: [0, 0.25, 1], ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

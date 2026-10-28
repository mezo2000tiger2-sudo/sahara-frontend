"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { SessionRenewal } from "@/features/auth/components/session-renewal";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider refetchInterval={30}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LazyMotion features={domAnimation} strict>
            <MotionConfig reducedMotion="user"><SessionRenewal />{children}</MotionConfig>
          </LazyMotion>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

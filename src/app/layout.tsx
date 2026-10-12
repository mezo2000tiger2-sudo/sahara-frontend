import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Outfit } from "next/font/google";

import { Providers } from "@/components/providers";
import "./tailwind.generated.css";

const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const headingFont = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Saharah",
  description: "A little space for honest words.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${bodyFont.variable} ${headingFont.variable}`} suppressHydrationWarning>
      <head>
        {/* Saharah provides both themes; prevent Dark Reader from recoloring them. */}
        <meta name="darkreader-lock" />
      </head>
      <body className="min-h-dvh bg-page font-sans text-ink antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:px-5 focus:py-3">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

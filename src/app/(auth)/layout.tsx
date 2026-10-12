import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { AuthMessageProvider } from "@/context/auth-message-context";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await auth()) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="page-shell flex-1 py-6 sm:py-10 lg:py-12">
        <section className="mx-auto w-full max-w-lg rounded-2xl border border-outline bg-surface p-6 shadow-soft sm:p-8"><AuthMessageProvider>{children}</AuthMessageProvider></section>
      </main>
    </div>
  );
}


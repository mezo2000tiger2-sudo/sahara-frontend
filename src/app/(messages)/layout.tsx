import type { ReactNode } from "react";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";

export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return <div className="flex min-h-dvh flex-col">
    <SiteHeader showSignIn signedIn={Boolean(session)} />
    <main id="main-content" className="page-shell w-full flex-1 pt-6 pb-16 sm:pt-10 sm:pb-20"><div className="mx-auto w-full max-w-4xl">{children}</div></main>
  </div>;
}

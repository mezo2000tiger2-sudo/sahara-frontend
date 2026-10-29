import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { auth } from "@/auth";
import { ProfileEntrance } from "./profile/profile-entrance";

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showSignIn signedIn={Boolean(session)} />
      <main id="main-content" className="page-shell w-full flex-1 pt-6 pb-16 sm:pt-10 sm:pb-20">
        <ProfileEntrance>{children}</ProfileEntrance>
      </main>
    </div>
  );
}

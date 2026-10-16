import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { ProfileEntrance } from "./profile/profile-entrance";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="page-shell w-full flex-1 pt-6 pb-16 sm:pt-10 sm:pb-20">
        <ProfileEntrance>{children}</ProfileEntrance>
      </main>
    </div>
  );
}

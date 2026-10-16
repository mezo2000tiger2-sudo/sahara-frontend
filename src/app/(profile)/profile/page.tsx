import type { Metadata } from "next";

import { ProfileActions } from "@/features/profile/components/profile-actions";
import { ProfileLoader } from "@/features/profile/components/profile-loader";

export const metadata: Metadata = {
  title: "Your profile | Saharah",
  description: "Your personal space on Saharah.",
};

export default function ProfilePage() {
  const shareOrigin = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : undefined;

  return (
    <>
      <div className="mb-8 text-center sm:mb-10">
        <p className="mb-2 text-sm font-medium text-main">Your little space</p>
        <h1 className="font-heading text-page-title font-semibold text-balance">Your profile</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-balance text-ink-muted sm:text-base sm:leading-7">A little about you. A simple way to stay connected.</p>
      </div>
      <ProfileLoader><ProfileActions shareOrigin={shareOrigin} /></ProfileLoader>
    </>
  );
}

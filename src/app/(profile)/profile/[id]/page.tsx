import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { SendMessageDialog } from "@/features/messages/components/send-message-dialog";
import { ProfileDetails } from "@/features/profile/components/profile-details";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { getPublicProfile } from "@/lib/profile-api.server";

export const metadata: Metadata = {
  title: "Shared profile | Saharah",
  description: "A little about someone on Saharah.",
  robots: { index: false, follow: false },
};

export default async function SharedProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();

  let profile;
  try {
    profile = (await getPublicProfile(id)).user;
  } catch (error) {
    if (error instanceof ProfileApiError && error.status === 404) notFound();
    return <ProfileError message={error instanceof Error ? error.message : String(error)} />;
  }

  // A session lookup failure must still allow anonymous messages on this public page.
  const session = await auth().catch(() => null);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-main">A little space for connection</p>
        <h1 className="font-heading text-page-title font-semibold">Shared profile</h1>
      </div>
      <ProfileDetails profile={profile} />
      <div className="mt-4">
        <SendMessageDialog recevierId={id} signedIn={Boolean(session?.user && !session.error)} />
      </div>
    </div>
  );
}

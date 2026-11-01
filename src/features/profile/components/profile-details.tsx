import Link from "next/link";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProfileImages } from "@/features/profile/components/profile-images";
import type { PublicProfile } from "@/schema/profileSchema";

export function ProfileDetails({ profile, editable = false }: {
  profile: PublicProfile & { createdAt?: string };
  editable?: boolean;
}) {
  const details = [
    ["Email address", profile.email],
    ["Age", profile.age ?? "Not provided"],
    ["Gender", profile.gender ? profile.gender[0].toUpperCase() + profile.gender.slice(1) : "Not provided"],
    ["Phone number", profile.phone || "Not provided"],
  ];

  return (
    <section aria-labelledby="profile-details-title" className="min-w-0 overflow-hidden rounded-2xl border border-outline bg-surface lg:col-span-2">
      <ProfileImages profile={profile} editable={editable} />
      <div className="p-5 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-heading text-lg leading-tight font-semibold tracking-tight">Personal details</h3>
          {editable ? <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/profile/edit"><Pencil aria-hidden="true" />Update profile</Link>
          </Button> : null}
        </div>
        <dl className="grid gap-x-10 gap-y-5 text-center sm:grid-cols-2 sm:text-left">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0 border-b border-outline pb-5">
              <dt className="text-base font-medium leading-6 text-ink-muted">{label}</dt>
              <dd className="mt-2 font-heading text-xl font-medium leading-8 wrap-anywhere sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

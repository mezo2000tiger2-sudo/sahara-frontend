import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ProfileLoader } from "@/features/profile/components/profile-loader";
import { UpdatePasswordForm } from "@/features/profile/components/update-password-form";

export const metadata: Metadata = { title: "Update password | Saharah" };

export default function PasswordPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/profile" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-main"><ArrowLeft className="size-4" aria-hidden="true" />Back to profile</Link>
      <h1 className="font-heading text-page-title font-semibold">Update password</h1>
      <p className="mt-3 mb-8 text-sm leading-6 text-ink-muted">You&apos;ll sign in again after saving your new password.</p>
      <ProfileLoader><UpdatePasswordForm /></ProfileLoader>
    </div>
  );
}

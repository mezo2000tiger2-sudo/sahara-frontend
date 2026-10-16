"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, LogOut, Monitor, Share2, ShieldCheck } from "lucide-react";

import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/profile/api";
import { ProfileDetails } from "@/features/profile/components/profile-details";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";

export function ProfileActions({ shareOrigin }: { shareOrigin?: string }) {
  const profileQuery = useQuery(profileQueryOptions);
  const queryClient = useQueryClient();
  const [confirmAll, setConfirmAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string>();
  const logoutMutation = useMutation({
    mutationFn: logout,
    retry: false,
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      window.location.replace("/signin");
    },
  });

  if (profileQuery.isError) return <ProfileError message={profileQuery.error.message}
    status={profileQuery.error instanceof ProfileApiError ? profileQuery.error.status : undefined}
    onRetry={() => { void profileQuery.refetch(); }} />;
  if (!profileQuery.data) return <p role="status" className="text-sm text-ink-muted">Loading profile…</p>;

  const profile = profileQuery.data;
  const sharePath = `/profile/${profile._id}`;
  const shareUrl = shareOrigin ? `${shareOrigin}${sharePath}` : sharePath;
  const busy = logoutMutation.isPending;

  async function copyLink() {
    setCopyError(undefined);
    setCopied(false);
    setCopying(true);
    try {
      if (!navigator.clipboard) throw new Error("Copying is unavailable. Select and copy the link above.");
      await navigator.clipboard.writeText(`${shareOrigin ?? window.location.origin}${sharePath}`);
      setCopied(true);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : String(error));
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProfileDetails profile={profile} editable />
      <section aria-labelledby="share-title" className="min-w-0 rounded-2xl border border-outline bg-surface p-5 sm:p-8">
        <Share2 className="mb-4 size-5 text-main" strokeWidth={1.75} aria-hidden="true" />
        <h2 id="share-title" className="font-heading text-lg font-semibold tracking-tight">Share your profile</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Your own link, ready to share with someone you&apos;d like to hear from.</p>
        <div className="mt-6 rounded-lg border border-outline bg-surface-muted p-4">
          <p className="mb-2 text-sm font-medium">Your profile link</p>
          <a href={shareUrl} className="block font-mono text-sm leading-6 wrap-anywhere text-main underline underline-offset-4">{shareUrl}</a>
        </div>
        <Button type="button" disabled={copying} className="mt-4 w-full" onClick={copyLink}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied" : "Copy profile link"}
        </Button>
        <p role="status" className="mt-3 text-sm leading-6 text-ink-subtle">{copied ? "Profile link copied." : "Visitors can see your name, email, phone, age, and gender."}</p>
        {copyError ? <Alert variant="destructive" className="mt-3 wrap-anywhere">{copyError}</Alert> : null}
      </section>

      <section aria-labelledby="account-title" className="min-w-0 rounded-2xl border border-outline bg-surface p-5 sm:p-8">
        <ShieldCheck className="mb-4 size-5 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
        <h2 id="account-title" className="font-heading text-lg font-semibold tracking-tight">Account and security</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Manage your password and where you&apos;re signed in.</p>
        {profile.providor === "system" ? (
          <Button asChild variant="outline" className="mt-6 w-full"><Link href="/profile/password"><KeyRound aria-hidden="true" />Update password</Link></Button>
        ) : (
          <>
            <Button type="button" variant="outline" disabled className="mt-6 w-full"><KeyRound aria-hidden="true" />Update password</Button>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Manage your password through {profile.providor === "google" ? "Google" : "GitHub"}.</p>
          </>
        )}
        <div className="mt-6 border-t border-outline pt-6">
          <Button type="button" variant="outline" disabled={busy} className="w-full text-danger hover:bg-red-500 hover:text-white" onClick={() => logoutMutation.mutate(false)}>
            {busy && !logoutMutation.variables ? <LoadingSpinner /> : <LogOut aria-hidden="true" />}Log out of this device
          </Button>
          <p className="mt-2 text-sm leading-6 text-ink-muted">End your current session on this device.</p>
        </div>
        <div className="mt-6 border-t border-outline pt-6">
          {confirmAll ? (
            <div className="space-y-3">
              <p className="text-sm leading-6">Log out of every device, including this one?</p>
              <Button type="button" variant="destructive" disabled={busy} className="w-full" onClick={() => logoutMutation.mutate(true)}>
                {busy ? <LoadingSpinner /> : <Monitor aria-hidden="true" />}Confirm logout
              </Button>
              <Button type="button" variant="ghost" disabled={busy} className="w-full" onClick={() => setConfirmAll(false)}>Cancel</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" disabled={busy} className="w-full text-danger hover:bg-red-500 hover:text-white" onClick={() => { logoutMutation.reset(); setConfirmAll(true); }}>
              <Monitor aria-hidden="true" />Log out of all devices
            </Button>
          )}
          <p className="mt-2 text-sm leading-6 text-ink-muted">End all sessions, including this one. You&apos;ll need to sign in again.</p>
        </div>
        {logoutMutation.error ? <Alert variant="destructive" className="mt-4 wrap-anywhere">{logoutMutation.error.message}</Alert> : null}
      </section>
    </div>
  );
}

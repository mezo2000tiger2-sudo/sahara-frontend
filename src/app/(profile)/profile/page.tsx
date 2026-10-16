import type { Metadata } from "next";
import { Copy, KeyRound, LogOut, Monitor, Pencil, Share2, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileEntrance } from "./profile-entrance";

export const metadata: Metadata = {
  title: "Your profile | Saharah",
  description: "Your personal space on Saharah.",
};

// shortcut: fictional data and inactive actions, replace when profile integration is requested.
const profile = {
  name: "Alex Morgan",
  initials: "AM",
  email: "alex@example.com",
  age: "26",
  gender: "Not provided",
  phone: "Not provided",
  joined: "October 2026",
  shareUrl: "http://localhost:3001/profile/507f1f77bcf86cd799439011",
};

export default function ProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="page-shell w-full flex-1 pt-6 pb-16 sm:pt-10 sm:pb-20">
        <ProfileEntrance>
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-main">Your little space</p>
              <h1 className="font-heading text-page-title font-semibold text-balance">Your profile</h1>
              <p className="mt-3 max-w-md text-sm leading-6 sm:text-base sm:leading-7 text-balance text-ink-muted">A little about you. A simple way to stay connected.</p>
            </div>
            <p className="max-w-xs shrink-0 self-start rounded-lg border border-outline bg-surface-muted px-3 py-2 text-xs leading-5 text-ink-muted sm:self-auto">Design preview — actions are inactive</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="profile-details-title" className="min-w-0 rounded-2xl border border-outline bg-surface lg:col-span-2">
              <div className="flex items-center gap-4 border-b border-outline bg-main-soft/30 p-5 sm:gap-5 sm:p-8">
                <Avatar className="size-16 shrink-0 sm:size-20">
                  <AvatarFallback className="bg-main-soft font-heading text-xl sm:text-2xl font-semibold text-main">{profile.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 id="profile-details-title" className="font-heading text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl">{profile.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-subtle">Joined {profile.joined}</p>
                </div>
              </div>
              <div className="p-5 sm:p-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-heading text-lg leading-tight font-semibold tracking-tight">Personal details</h3>
                  <Button type="button" variant="outline" className="w-full sm:w-auto"><Pencil aria-hidden="true" />Update profile</Button>
                </div>
                <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                  <div className="min-w-0 border-b border-outline pb-5">
                    <dt className="text-xs font-medium leading-5 text-ink-muted">Email address</dt>
                    <dd className="mt-1 text-sm leading-6 sm:text-base wrap-anywhere">{profile.email}</dd>
                  </div>
                  <div className="min-w-0 border-b border-outline pb-5">
                    <dt className="text-xs font-medium leading-5 text-ink-muted">Age</dt>
                    <dd className="mt-1 text-sm leading-6 sm:text-base">{profile.age}</dd>
                  </div>
                  <div className="min-w-0 border-b border-outline pb-5">
                    <dt className="text-xs font-medium leading-5 text-ink-muted">Gender</dt>
                    <dd className="mt-1 text-sm leading-6 sm:text-base text-ink-muted">{profile.gender}</dd>
                  </div>
                  <div className="min-w-0 border-b border-outline pb-5">
                    <dt className="text-xs font-medium leading-5 text-ink-muted">Phone number</dt>
                    <dd className="mt-1 text-sm leading-6 sm:text-base text-ink-muted">{profile.phone}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section aria-labelledby="share-title" className="min-w-0 rounded-2xl border border-outline bg-surface p-5 sm:p-8">
              <Share2 className="mb-4 size-5 text-main" strokeWidth={1.75} aria-hidden="true" />
              <h2 id="share-title" className="font-heading text-lg font-semibold tracking-tight">Share your profile</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Your own link, ready to share with someone you&apos;d like to hear from.</p>
              <div className="mt-6 rounded-lg border border-outline bg-surface-muted p-4">
                <p className="mb-2 text-sm font-medium">Your profile link</p>
                <p className="font-mono text-sm leading-6 wrap-anywhere text-ink-muted">{profile.shareUrl}</p>
              </div>
              <Button type="button" className="mt-4 w-full"><Copy aria-hidden="true" />Copy profile link</Button>
              <p className="mt-3 text-sm leading-6 text-ink-subtle">Sample link for this preview.</p>
            </section>

            <section aria-labelledby="account-title" className="min-w-0 rounded-2xl border border-outline bg-surface p-5 sm:p-8">
              <ShieldCheck className="mb-4 size-5 text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
              <h2 id="account-title" className="font-heading text-lg font-semibold tracking-tight">Account and security</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Manage your password and where you&apos;re signed in.</p>
              <Button type="button" variant="outline" className="mt-6 w-full"><KeyRound aria-hidden="true" />Update password</Button>
              <div className="mt-6 border-t border-outline pt-6">
                <Button type="button" variant="outline" className="w-full text-danger"><LogOut aria-hidden="true" />Log out of this device</Button>
                <p className="mt-2 text-sm leading-6 text-ink-muted">End your current session on this device.</p>
              </div>
              <div className="mt-6 border-t border-outline pt-6">
                <Button type="button" variant="outline" className="w-full text-danger"><Monitor aria-hidden="true" />Log out of all devices</Button>
                <p className="mt-2 text-sm leading-6 text-ink-muted">End all sessions, including this one. You&apos;ll need to sign in again.</p>
              </div>
            </section>
          </div>
        </ProfileEntrance>
      </main>
    </div>
  );
}

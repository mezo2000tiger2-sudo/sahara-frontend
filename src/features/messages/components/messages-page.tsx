"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import { MessageList } from "./message-list";
import { IdentityRequestList } from "./identity-request-list";

export function MessagesPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "requests" ? "requests" : "messages";
  const direction = searchParams.get("direction") === "sent" ? "sent" : "received";
  const profile = useQuery(profileQueryOptions);
  return <>
    <div className="mb-8 text-center"><p className="mb-2 text-sm font-medium text-main">A space to connect</p><h1 className="font-heading text-page-title font-semibold">Your messages</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">Read your messages and manage requests to share an identity.</p></div>
    <nav aria-label="Message views" className="mb-4 flex flex-wrap justify-center gap-3">
      {(["messages", "requests"] as const).map((item) => <Button asChild key={item} variant={view === item ? "default" : "outline"}><Link href={`/message?view=${item}&direction=${direction}`} aria-current={view === item ? "page" : undefined}>{item === "messages" ? "Messages" : "Identity requests"}</Link></Button>)}
    </nav>
    <nav aria-label="Message direction" className="mb-8 flex justify-center gap-3">
      {(["received", "sent"] as const).map((item) => <Button asChild key={item} variant={direction === item ? "secondary" : "ghost"}><Link href={`/message?view=${view}&direction=${item}`} aria-current={direction === item ? "page" : undefined}>{item === "received" ? "Received" : "Sent"}</Link></Button>)}
    </nav>
    {profile.isPending ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading your account…</p> : profile.error ? <ProfileError message={profile.error.message} status={profile.error instanceof ProfileApiError ? profile.error.status : undefined} onRetry={() => void profile.refetch()} /> : profile.data ? view === "messages" ? <MessageList key={`${profile.data._id}-${direction}`} userId={profile.data._id} direction={direction} /> : <IdentityRequestList key={`${profile.data._id}-${direction}`} userId={profile.data._id} direction={direction} /> : null}
  </>;
}

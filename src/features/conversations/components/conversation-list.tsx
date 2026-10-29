"use client";

import Link from "next/link";
import { ArrowUpRight, MessagesSquare } from "lucide-react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { MessageError } from "@/features/messages/components/message-error";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import { conversationsQueryOptions } from "@/features/conversations/queries";

function ConversationItems({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery(conversationsQueryOptions(userId, queryClient));
  const conversations = [...new Map(query.data?.pages.flatMap((page) => page.conversations).map((conversation) => [conversation._id, conversation])).values()];
  return <section aria-label="Your conversations" className="space-y-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-ink-muted">Conversations with shared identities</p><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</Button></div>
    {query.isPending ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading conversations…</p> : null}
    {query.error ? <div className="space-y-3"><MessageError error={query.error} /><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Try again</Button></div> : null}
    {!query.isPending && !query.error && !conversations.length ? <div className="rounded-2xl border border-outline bg-surface px-6 py-12 text-center"><MessagesSquare className="mx-auto mb-4 size-8 text-main" aria-hidden="true" /><h2 className="font-heading text-lg font-semibold">No conversations yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-muted">A conversation opens when an identity request is accepted.</p><Button asChild variant="outline" className="mt-5"><Link href="/message?view=requests">View identity requests</Link></Button></div> : null}
    <ul className="space-y-3">{conversations.map((conversation) => {
      const participant = conversation.participants.find((person) => person._id !== userId);
      const name = [participant?.fName, participant?.lName].filter(Boolean).join(" ") || "Participant";
      return <li key={conversation._id}><Link href={`/conversation/${conversation._id}`} className="group flex items-center gap-4 rounded-2xl border border-outline bg-surface p-5 transition-colors hover:border-main hover:bg-main-soft motion-reduce:transition-none sm:p-6"><Avatar size="lg"><AvatarImage src={participant?.avatar ?? undefined} alt="" /><AvatarFallback>{participant?.fName?.[0]}{participant?.lName?.[0]}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><h2 className="truncate font-heading text-base font-semibold">{name}</h2><p className="mt-1 text-xs text-ink-muted">Started <time dateTime={conversation.createdAt}>{new Date(conversation.createdAt).toLocaleDateString()}</time></p></div><ArrowUpRight className="size-5 shrink-0 text-main" aria-hidden="true" /><span className="sr-only">Open conversation</span></Link></li>;
    })}</ul>
    {query.hasNextPage ? <div className="text-center"><Button variant="outline" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading…" : "Load more conversations"}</Button></div> : null}
  </section>;
}

export function ConversationList() {
  const profile = useQuery(profileQueryOptions);
  return <>
    <div className="mb-8"><p className="mb-2 text-sm font-medium text-main">Keep the conversation going</p><h1 className="font-heading text-page-title font-semibold">Your conversations</h1><p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted">Continue talking with people who have shared their identity with you.</p></div>
    {profile.isPending ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading your account…</p> : profile.error ? <ProfileError message={profile.error.message} status={profile.error instanceof ProfileApiError ? profile.error.status : undefined} onRetry={() => void profile.refetch()} /> : profile.data ? <ConversationItems key={profile.data._id} userId={profile.data._id} /> : null}
  </>;
}

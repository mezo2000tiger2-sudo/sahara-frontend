"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { messagesQueryOptions } from "@/features/messages/queries";
import { MessageCard } from "./message-card";
import { MessageError } from "./message-error";
import { InfiniteScrollFooter } from "./infinite-scroll-footer";
import type { Direction } from "@/schema/messageSchema";

export function MessageList({ userId, direction }: { userId: string; direction: Direction }) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery(messagesQueryOptions(userId, direction, queryClient));
  const messages = [...new Map(query.data?.pages.flatMap((page) => page.messages).map((message) => [message._id, message])).values()];
  return <section aria-label={`${direction} messages`} className="space-y-4">
    <div className="flex items-center justify-between gap-4"><h2 className="font-heading text-lg font-semibold">{direction === "received" ? "Received messages" : "Sent messages"}</h2><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</Button></div>
    {query.isPending ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading messages…</p> : null}
    {query.error ? <MessageError error={query.error} /> : null}
    {!query.isPending && !query.error && !messages.length ? <p className="rounded-2xl border border-outline bg-surface p-8 text-center text-sm text-ink-muted">{direction === "received" ? "No messages received yet. Share your profile to hear from someone." : "No sent messages yet. Messages sent while signed in will appear here."}</p> : null}
    {messages.map((message) => <MessageCard key={message._id} message={message} />)}
    {query.data ? <InfiniteScrollFooter hasNextPage={query.hasNextPage} fetching={query.isFetching} failed={query.isError} onLoadMore={() => { if (!query.isFetching) void query.fetchNextPage(); }} /> : query.error ? <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button> : null}
  </section>;
}

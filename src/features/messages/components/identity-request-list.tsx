"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { identityRequestsQueryOptions } from "@/features/messages/queries";
import { IdentityRequestCard } from "./identity-request-card";
import { MessageError } from "./message-error";
import { InfiniteScrollFooter } from "./infinite-scroll-footer";
import type { Direction } from "@/schema/messageSchema";

export function IdentityRequestList({ userId, direction }: { userId: string; direction: Direction }) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery(identityRequestsQueryOptions(userId, direction, queryClient));
  const requests = [...new Map(query.data?.pages.flatMap((page) => page.requests).map((request) => [request._id, request])).values()];
  return <section aria-label={`${direction} identity requests`} className="space-y-4">
    <div className="flex items-center justify-between gap-4"><h2 className="font-heading text-lg font-semibold">{direction === "received" ? "Received requests" : "Sent requests"}</h2><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</Button></div>
    <p className="text-sm leading-6 text-ink-muted">{direction === "received" ? "These recipients are asking you to reveal your identity as the sender." : "These are requests you made to learn a message sender’s identity."}</p>
    {query.isPending ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading identity requests…</p> : null}
    {query.error ? <MessageError error={query.error} /> : null}
    {!query.isPending && !query.error && !requests.length ? <p className="rounded-2xl border border-outline bg-surface p-8 text-center text-sm text-ink-muted">No {direction} identity requests yet.</p> : null}
    {requests.map((request) => <IdentityRequestCard key={request._id} request={request} userId={userId} direction={direction} />)}
    {query.data ? <InfiniteScrollFooter hasNextPage={query.hasNextPage} fetching={query.isFetching} failed={query.isError} onLoadMore={() => { if (!query.isFetching) void query.fetchNextPage(); }} /> : query.error ? <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button> : null}
  </section>;
}

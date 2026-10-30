"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/loading-spinner";
import { MessageError } from "@/features/messages/components/message-error";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import { sendConversationMessage } from "@/features/conversations/api";
import { conversationMessagesQueryOptions } from "@/features/conversations/queries";
import { sendConversationMessageSchema } from "@/schema/conversationSchema";
import { MessageBubble } from "./message-bubble";

function ConversationThread({ conversationId, userId }: { conversationId: string; userId: string }) {
  const queryClient = useQueryClient();
  const [followingLatest, setFollowingLatest] = useState(true);
  // shortcut: pause automatic refresh while reading older offset pages; cursor pagination can preserve them during updates.
  const query = useInfiniteQuery({
    ...conversationMessagesQueryOptions(userId, conversationId, queryClient),
    refetchInterval: followingLatest ? 10_000 : false,
    refetchOnWindowFocus: followingLatest,
    refetchOnReconnect: followingLatest,
  });
  const [content, setContent] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const olderPosition = useRef<{ height: number; top: number } | null>(null);
  const messages = [...new Map(query.data?.pages.flatMap((page) => page.messages).map((message) => [message._id, message])).values()].reverse();
  const conversation = query.data?.pages[0]?.conversation;
  const mutation = useMutation({
    mutationFn: (text: string) => sendConversationMessage(conversationId, { content: text }, queryClient),
    retry: false,
    onSuccess: async () => {
      setContent("");
      nearBottom.current = true;
      setFollowingLatest(true);
      await queryClient.invalidateQueries({ queryKey: ["conversations", userId, "messages", conversationId] });
    },
  });

  useLayoutEffect(() => {
    const history = historyRef.current;
    if (!history) return;
    if (olderPosition.current) {
      history.scrollTop = olderPosition.current.top + history.scrollHeight - olderPosition.current.height;
      olderPosition.current = null;
    } else if (nearBottom.current) {
      history.scrollTop = history.scrollHeight;
    }
  }, [query.data]);

  function loadOlder() {
    const history = historyRef.current;
    if (!history || query.isFetching) return;
    setFollowingLatest(false);
    olderPosition.current = { height: history.scrollHeight, top: history.scrollTop };
    void query.fetchNextPage().then((result) => { if (result.isError) olderPosition.current = null; });
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = sendConversationMessageSchema.safeParse({ content });
    if (!parsed.success || mutation.isPending) return;
    mutation.mutate(parsed.data.content);
  }

  if (query.isPending) return <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading conversation…</p>;
  if (!conversation) return query.error ? <div className="space-y-4"><MessageError error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></div> : null;
  const participant = conversation.participants.find((person) => person._id !== userId);
  const name = [participant?.fName, participant?.lName].filter(Boolean).join(" ") || "Participant";
  return <section aria-label={`Conversation with ${name}`} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
    <header className="flex items-center gap-3 border-b border-outline px-4 py-4 sm:px-6"><Avatar size="lg"><AvatarImage src={participant?.avatar ?? undefined} alt="" /><AvatarFallback>{participant?.fName?.[0]}{participant?.lName?.[0]}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><h1 className="truncate font-heading text-lg font-semibold">{name}</h1><p className="text-xs text-ink-muted">Conversation</p></div><Button variant="ghost" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</Button></header>
    <div ref={historyRef} role="region" aria-label="Message history" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-page px-4 py-5 [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus sm:px-8" onScroll={(event) => { const element = event.currentTarget; nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; setFollowingLatest(nearBottom.current); }}>
      {query.hasNextPage ? <div className="mb-5 text-center"><Button variant="outline" disabled={query.isFetching} onClick={loadOlder}>{query.isFetchingNextPage ? "Loading…" : "Load older messages"}</Button></div> : null}
      {query.error ? <div className="mb-4"><MessageError error={query.error} /></div> : null}
      {!messages.length ? <p className="py-12 text-center text-sm text-ink-muted">No messages yet. Say hello to start the conversation.</p> : <ol className="space-y-4">{messages.map((message) => <MessageBubble key={message._id} message={message} participants={conversation.participants} userId={userId} />)}</ol>}
    </div>
    <form onSubmit={send} className="shrink-0 space-y-2 border-t border-outline p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8" aria-busy={mutation.isPending}>
      {mutation.error ? <MessageError error={mutation.error} /> : null}
      <Label htmlFor="conversation-message">Your message</Label>
      <textarea id="conversation-message" name="content" required maxLength={5000} rows={2} value={content} disabled={mutation.isPending} onChange={(event) => { setContent(event.target.value); if (mutation.isError) mutation.reset(); }} placeholder="Write a message…" className="block max-h-32 w-full resize-none rounded-xl border border-outline-strong bg-page px-3 py-2 text-sm leading-6 outline-none placeholder:text-ink-subtle focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60" aria-describedby="conversation-message-limit" />
      <div className="flex items-center justify-between gap-3"><p id="conversation-message-limit" className="text-xs text-ink-muted">{content.length.toLocaleString()} / 5,000</p><Button type="submit" disabled={!content.trim() || mutation.isPending}><Send className="size-4" aria-hidden="true" />{mutation.isPending ? "Sending…" : "Send message"}</Button></div>
      <p role="status" className="sr-only">{mutation.isSuccess ? "Message sent." : ""}</p>
    </form>
  </section>;
}

export function ConversationChat({ conversationId }: { conversationId: string }) {
  const profile = useQuery(profileQueryOptions);
  return <div className="flex h-full min-h-0 flex-col">
    <div className="shrink-0 border-b border-outline bg-surface px-4 py-3 sm:px-8"><Link href="/conversation" className="inline-flex items-center gap-2 text-sm font-medium text-main underline-offset-4 hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />All conversations</Link></div>
    {profile.isPending ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading your account…</p> : profile.error ? <ProfileError message={profile.error.message} status={profile.error instanceof ProfileApiError ? profile.error.status : undefined} onRetry={() => void profile.refetch()} /> : profile.data ? <ConversationThread key={`${profile.data._id}-${conversationId}`} userId={profile.data._id} conversationId={conversationId} /> : null}
  </div>;
}

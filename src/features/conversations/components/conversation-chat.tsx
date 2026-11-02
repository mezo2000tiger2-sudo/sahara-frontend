"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ImagePlus, Send, X } from "lucide-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState, LoadingSpinner } from "@/components/loading-spinner";
import { MessageError } from "@/features/messages/components/message-error";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import { sendConversationMessage } from "@/features/conversations/api";
import { conversationMessagesQueryOptions } from "@/features/conversations/queries";
import { sendConversationMessageSchema, type SendConversationMessageInput } from "@/schema/conversationSchema";
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<(string | undefined)[]>([]);
  useEffect(() => () => { previews.forEach((url) => { if (url) URL.revokeObjectURL(url); }); }, [previews]);

  function selectImages(files: File[]) {
    setAttachments(files);
    setPreviews(files.map((file) => file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined));
  }
  const fileInput = useRef<HTMLInputElement>(null);
  const validation = sendConversationMessageSchema.safeParse({ content, attachments });
  const historyRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const olderPosition = useRef<{ height: number; top: number } | null>(null);
  const messages = [...new Map(query.data?.pages.flatMap((page) => page.messages).map((message) => [message._id, message])).values()].reverse();
  const conversation = query.data?.pages[0]?.conversation;
  const mutation = useMutation({
    mutationFn: (input: SendConversationMessageInput) => sendConversationMessage(conversationId, input, queryClient),
    retry: false,
    onSuccess: async () => {
      setContent("");
      setAttachments([]);
      setPreviews([]);
      if (fileInput.current) fileInput.current.value = "";
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
    const parsed = sendConversationMessageSchema.safeParse({ content, attachments });
    if (!parsed.success || mutation.isPending) return;
    mutation.mutate(parsed.data);
  }

  if (query.isPending) return <LoadingState>Loading conversation…</LoadingState>;
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
      {attachments.length ? <ul aria-label="Selected images" className="flex gap-3 overflow-x-auto py-1">
        {attachments.map((file, index) => <li key={`${file.name}-${index}`} className="relative size-20 shrink-0 rounded-xl border border-outline bg-page">
          {/* Object URLs preview local files without uploading them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previews[index] ? <img src={previews[index]} alt={`Selected image: ${file.name}`} className="size-full rounded-xl object-cover" /> : <span className="block truncate p-2 text-xs text-ink-muted">{file.name}</span>}
          <Button type="button" variant="secondary" size="icon-xs" className="absolute right-1 top-1 rounded-full shadow-sm" aria-label={`Remove ${file.name}`} disabled={mutation.isPending} onClick={() => {
            selectImages(attachments.filter((_, imageIndex) => imageIndex !== index));
            if (fileInput.current) fileInput.current.value = "";
          }}><X aria-hidden="true" /></Button>
        </li>)}
      </ul> : null}
      {attachments.length && !validation.success ? <p id="conversation-images-error" role="alert" className="text-sm text-ink-muted">{validation.error.issues[0].message}</p> : null}
      <Label htmlFor="conversation-message" className="sr-only">Your message</Label>
      <div className="flex min-w-0 items-center gap-2">
        <Input id="conversation-message" name="content" maxLength={5000} value={content} disabled={mutation.isPending} onChange={(event) => { setContent(event.target.value); if (mutation.isError) mutation.reset(); }} placeholder="Write a message..." className="h-12 flex-1 rounded-xl bg-page px-4" aria-describedby="conversation-message-limit" />
        <input ref={fileInput} id="conversation-images" type="file" accept="image/png,image/jpeg,image/jpg" multiple hidden disabled={mutation.isPending} onChange={(event) => { selectImages(Array.from(event.target.files ?? [])); if (mutation.isError) mutation.reset(); }} />
        <Button type="button" variant="outline" size="icon-lg" className="rounded-xl bg-page" aria-label="Select images" title="Select up to 3 PNG or JPEG images" aria-describedby="conversation-images-help" disabled={mutation.isPending} onClick={() => fileInput.current?.click()}><ImagePlus className="size-5" aria-hidden="true" /></Button>
        <Button type="submit" size="icon-lg" className="rounded-xl" aria-label={mutation.isPending ? "Sending message" : "Send message"} disabled={!validation.success || mutation.isPending}>{mutation.isPending ? <LoadingSpinner /> : <Send className="size-5" aria-hidden="true" />}</Button>
      </div>
      <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-ink-muted">
        <p id="conversation-images-help">Up to 3 images</p>
        <p id="conversation-message-limit">{content.length.toLocaleString()} / 5,000</p>
      </div>
      <p role="status" className="sr-only">{mutation.isSuccess ? "Message sent." : ""}</p>
    </form>
  </section>;
}

export function ConversationChat({ conversationId }: { conversationId: string }) {
  const profile = useQuery(profileQueryOptions);
  return <div className="flex h-full min-h-0 flex-col">
    <div className="shrink-0 border-b border-outline bg-surface px-4 py-3 sm:px-8"><Link href="/conversation" className="inline-flex items-center gap-2 text-sm font-medium text-main underline-offset-4 hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />All conversations</Link></div>
    {profile.isPending ? <LoadingState>Loading your account…</LoadingState> : profile.error ? <ProfileError message={profile.error.message} status={profile.error instanceof ProfileApiError ? profile.error.status : undefined} onRetry={() => void profile.refetch()} /> : profile.data ? <ConversationThread key={`${profile.data._id}-${conversationId}`} userId={profile.data._id} conversationId={conversationId} /> : null}
  </div>;
}

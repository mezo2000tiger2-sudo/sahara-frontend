"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { profileQueryOptions } from "@/features/profile/queries";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { requestIdentity } from "@/features/messages/api";
import { messageQueryOptions } from "@/features/messages/queries";
import { MessageError } from "./message-error";

function MessageContent({ messageId, userId }: { messageId: string; userId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery(messageQueryOptions(userId, messageId, queryClient));
  const mutation = useMutation({
    mutationFn: () => requestIdentity(messageId, queryClient),
    retry: false,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["identity-requests", userId] });
      if (result.request.status === "accepted") await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messages", userId] }),
        queryClient.invalidateQueries({ queryKey: ["conversations", userId, "list"] }),
      ]);
    },
  });
  if (query.isPending) return <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading message…</p>;
  if (query.error && !query.data) return <div className="space-y-4"><MessageError error={query.error} />{![400, 404].includes(query.error instanceof ProfileApiError ? query.error.status : 0) ? <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button> : null}</div>;
  const message = query.data;
  if (!message) return null;
  const status = mutation.data?.request.status;
  const conversationId = mutation.data?.conversationId ?? message.conversationId;
  return <article className="space-y-6 rounded-2xl border border-outline bg-surface p-5 sm:p-8" aria-busy={mutation.isPending}>
    <div className="flex flex-wrap items-center justify-between gap-3"><time dateTime={message.createdAt} className="text-sm text-ink-muted">{new Date(message.createdAt).toLocaleString()}</time><Button variant="outline" disabled={query.isFetching || mutation.isPending} onClick={() => void query.refetch()}>Refresh</Button></div>
    {query.error ? <MessageError error={query.error} /> : null}
    <p className="whitespace-pre-wrap text-base leading-8 wrap-anywhere">{message.content || "This message contains attachments."}</p>
    {message.attachmentCount ? <div className="rounded-lg border border-outline bg-surface-muted p-4 text-sm leading-6 text-ink-muted"><p>{message.attachmentCount} {message.attachmentCount === 1 ? "attachment" : "attachments"}</p><p>Attachment preview is currently unavailable.</p></div> : null}
    {message.recevierId === userId ? <section aria-labelledby="identity-title" className="space-y-4 border-t border-outline pt-6">
      <h2 id="identity-title" className="font-heading text-lg font-semibold">Sender identity</h2>
      <p className="text-sm leading-6 text-ink-muted">Ask the sender to share their identity. They can choose to accept or reject your request.</p>
      {!status ? <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Requesting…" : "Request sender identity"}</Button> : <Alert role="status" className="bg-surface-muted!">{status === "pending" ? "Identity request pending. The sender can accept or reject it." : status === "accepted" ? "Identity request accepted. Your conversation is ready." : "Identity request rejected. It cannot be sent again."}</Alert>}
      {conversationId ? <Link href={`/conversation/${conversationId}`} className="block text-sm font-medium text-main underline-offset-4 hover:underline">Open conversation</Link> : null}
      {mutation.error ? <MessageError error={mutation.error} /> : null}
      <Link href="/message?view=requests&direction=sent" className="block text-sm font-medium text-main underline-offset-4 hover:underline">View sent identity requests</Link>
    </section> : null}
  </article>;
}

export function MessageDetail({ messageId }: { messageId: string }) {
  const profile = useQuery(profileQueryOptions);
  return <>
    <Link href="/message" className="mb-6 inline-flex text-sm font-medium text-main underline-offset-4 hover:underline">← Back to messages</Link>
    <h1 className="mb-8 font-heading text-page-title font-semibold">Your message</h1>
    {profile.isPending ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoadingSpinner />Loading your account…</p> : profile.error ? <ProfileError message={profile.error.message} status={profile.error instanceof ProfileApiError ? profile.error.status : undefined} onRetry={() => void profile.refetch()} /> : profile.data ? <MessageContent key={`${profile.data._id}-${messageId}`} userId={profile.data._id} messageId={messageId} /> : null}
  </>;
}

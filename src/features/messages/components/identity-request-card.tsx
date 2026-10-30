"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { decideIdentityRequest } from "@/features/messages/api";
import { MessageError } from "./message-error";
import type { IdentityRequest } from "@/schema/identityRequestSchema";
import type { Direction } from "@/schema/messageSchema";

export function IdentityRequestCard({ request, userId, direction }: { request: IdentityRequest; userId: string; direction: Direction }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: "accepted" | "rejected") => decideIdentityRequest(request._id, status, queryClient),
    retry: false,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["identity-requests", userId] });
      if (result.request.status === "accepted") await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messages", userId] }),
        queryClient.invalidateQueries({ queryKey: ["conversations", userId, "list"] }),
      ]);
    },
  });
  const status = mutation.data?.request.status ?? request.status;
  const conversationId = mutation.data?.conversationId ?? request.conversationId;
  const requesterName = [request.requester?.fName, request.requester?.lName].filter(Boolean).join(" ");
  return <article className="space-y-4 rounded-2xl border border-outline bg-surface p-5 sm:p-6" aria-busy={mutation.isPending}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-medium">{direction === "received" ? `${requesterName || "The recipient"} requested your identity` : "You requested the sender’s identity"}</p>
      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium capitalize">{status}</span>
    </div>
    <time dateTime={request.createdAt} className="block text-xs text-ink-muted">{new Date(request.createdAt).toLocaleString()}</time>
    {status === "accepted" ? <Alert role="status" className="border-success/30 bg-success-soft! text-success!">Identity request accepted. {conversationId ? <Link href={`/conversation/${conversationId}`} className="font-medium underline underline-offset-4">Open conversation</Link> : "Your conversation is unavailable."}</Alert> : null}
    {status === "rejected" ? <p role="status" className="text-sm text-ink-muted">This request was rejected. It cannot be sent again.</p> : null}
    {direction === "received" && status === "pending" ? <div className="space-y-3">
      <p className="text-sm leading-6 text-ink-muted">Accepting shares your identity with the recipient and creates a conversation.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate("accepted")}>{mutation.isPending && mutation.variables === "accepted" ? "Accepting…" : "Accept"}</Button>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("rejected")}>{mutation.isPending && mutation.variables === "rejected" ? "Rejecting…" : "Reject"}</Button>
      </div>
    </div> : null}
    {mutation.error ? <MessageError error={mutation.error} /> : null}
    <Link href={`/message/${request.messageId}`} className="inline-flex text-sm font-medium text-main underline-offset-4 hover:underline">Open message</Link>
  </article>;
}

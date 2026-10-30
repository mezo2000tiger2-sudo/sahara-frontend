import type { QueryClient } from "@tanstack/react-query";
import { messageRequest } from "@/features/messages/api";
import { conversationMessagesResponseSchema, conversationsResponseSchema, sendConversationMessageResponseSchema, type SendConversationMessageInput } from "@/schema/conversationSchema";

export function fetchConversations(page: number, size: number, queryClient: QueryClient, signal?: AbortSignal) {
  return messageRequest(`/api/conversations?${new URLSearchParams({ page: String(page), size: String(size) })}`, conversationsResponseSchema, queryClient, { signal });
}

export function fetchConversationMessages(conversationId: string, page: number, size: number, queryClient: QueryClient, signal?: AbortSignal) {
  return messageRequest(`/api/conversations/${encodeURIComponent(conversationId)}/messages?${new URLSearchParams({ page: String(page), size: String(size) })}`, conversationMessagesResponseSchema, queryClient, { signal });
}

export function sendConversationMessage(conversationId: string, input: SendConversationMessageInput, queryClient: QueryClient) {
  return messageRequest(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, sendConversationMessageResponseSchema, queryClient, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
}

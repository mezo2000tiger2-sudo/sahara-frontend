import { backendProfileError, ProfileApiError } from "@/features/profile/errors";
import { createMessageResponseSchema, type CreateMessageInput } from "@/schema/createMessageSchema";
import type { QueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import type { z } from "zod";
import { renewSession } from "@/features/auth/renew-session";
import { messageResponseSchema, messagesResponseSchema, type Direction } from "@/schema/messageSchema";
import { identityRequestResultSchema, identityRequestsResponseSchema } from "@/schema/identityRequestSchema";

export async function sendMessage(values: CreateMessageInput) {
  const body = new FormData();
  body.set("recevierId", values.recevierId);
  body.set("identity", values.identity);
  if (values.content) body.set("content", values.content);
  for (const attachment of values.attachments) body.append("attachments", attachment);

  const response = await fetch("/api/messages", { method: "POST", body });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw backendProfileError(payload, response.status, response.statusText);
  const parsed = createMessageResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ProfileApiError("Invalid response from the message service.", 502);
  return parsed.data;
}

async function messageRequest<T extends z.ZodType>(path: string, schema: T, queryClient: QueryClient, options?: RequestInit): Promise<z.output<T>> {
  async function request() {
    try {
      return await fetch(path, { ...options, cache: "no-store" });
    } catch (error) {
      if (options?.signal?.aborted) throw error;
      throw new ProfileApiError("Unable to reach the message service.", 503);
    }
  }
  let response = await request();
  let payload: unknown = await response.json().catch(() => null);
  if (!response.ok && backendProfileError(payload, response.status, response.statusText).message === "jwt expired") {
    try {
      response = (await renewSession()).clone();
    } catch {
      throw new ProfileApiError("Unable to renew your session. Please try again.", 503);
    }
    if (response.ok) response = await request();
    payload = await response.json().catch(() => null);
  }
  if (response.status === 401) {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut({ redirectTo: "/signin?error=SessionExpired" });
  }
  if (!response.ok) throw backendProfileError(payload, response.status, response.statusText);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ProfileApiError("Invalid response from the message service.", 502);
  return parsed.data;
}

export async function fetchMessages(direction: Direction, page: number, size: number, queryClient: QueryClient, signal?: AbortSignal) {
  const result = await messageRequest(`/api/messages?${new URLSearchParams({ direction, page: String(page), size: String(size) })}`, messagesResponseSchema, queryClient, { signal });
  return result.data;
}

export async function fetchMessage(messageId: string, queryClient: QueryClient, signal?: AbortSignal) {
  const result = await messageRequest(`/api/messages/${encodeURIComponent(messageId)}`, messageResponseSchema, queryClient, { signal });
  return result.message;
}

export function fetchIdentityRequests(direction: Direction, page: number, size: number, queryClient: QueryClient, signal?: AbortSignal) {
  return messageRequest(`/api/identity-requests?${new URLSearchParams({ direction, page: String(page), size: String(size) })}`, identityRequestsResponseSchema, queryClient, { signal });
}

export function requestIdentity(messageId: string, queryClient: QueryClient) {
  return messageRequest("/api/identity-requests", identityRequestResultSchema, queryClient, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId }),
  });
}

export function decideIdentityRequest(requestId: string, status: "accepted" | "rejected", queryClient: QueryClient) {
  return messageRequest(`/api/identity-requests/${encodeURIComponent(requestId)}`, identityRequestResultSchema, queryClient, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
  });
}

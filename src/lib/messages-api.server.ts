import "server-only";

import { z } from "zod";

import { backendProfileError, ProfileApiError } from "@/features/profile/errors";
import { backendUrl } from "@/lib/backend-api.server";
import { checkProfileOrigin } from "@/lib/profile-api.server";
import { backendMessageResponseSchema, backendMessagesResponseSchema, messageListInputSchema, type MessageListInput } from "@/schema/messageSchema";
import { identityRequestResultSchema, identityRequestsResponseSchema, type CreateIdentityRequestInput, type DecideIdentityRequestInput } from "@/schema/identityRequestSchema";
import { decryptToken } from "@/utils/decrypt-token";

export function messageJson(payload: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(payload, { ...init, headers });
}

export function messageErrorResponse(error: unknown) {
  const failure = error instanceof ProfileApiError ? error : new ProfileApiError("The message service is unavailable.", 503);
  return messageJson({ message: failure.message, details: failure.details }, { status: failure.status });
}

export function parseMessageInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ProfileApiError(parsed.error.issues[0].message, 400, parsed.error.issues.map((issue) => ({
    path: issue.path.join("."), message: issue.message,
  })));
  return parsed.data;
}

export function readMessageListInput(request: Request) {
  return parseMessageInput(messageListInputSchema, Object.fromEntries(new URL(request.url).searchParams));
}

export async function readMessageInput<T extends z.ZodType>(request: Request, schema: T) {
  checkProfileOrigin(request);
  return parseMessageInput(schema, await request.json().catch(() => null));
}

async function messageRequest<T extends z.ZodType>(path: string, schema: T, body?: unknown, method = "GET"): Promise<{ payload: z.output<T>; status: number }> {
  const token = await decryptToken(true);
  if (!token) throw new ProfileApiError("Your session expired. Please sign in again.", 401);

  let response: Response;
  try {
    response = await fetch(backendUrl(path), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ProfileApiError("Unable to reach the message service.", 503);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw backendProfileError(payload, response.status, response.statusText);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ProfileApiError("Invalid response from the message service.", 502);
  return { payload: parsed.data, status: response.status };
}

export async function getMessages({ direction, page, size }: MessageListInput) {
  const endpoint = direction === "sent" ? "get-sent-messages" : "get-messages";
  return (await messageRequest(`/message/${endpoint}?${new URLSearchParams({ page: String(page), size: String(size) })}`, backendMessagesResponseSchema)).payload;
}

export async function getMessage(messageId: string) {
  return (await messageRequest(`/message/get-message-by-id/${encodeURIComponent(messageId)}`, backendMessageResponseSchema)).payload;
}

export async function getIdentityRequests({ direction, page, size }: MessageListInput) {
  return (await messageRequest(`/identity-request?${new URLSearchParams({ direction, page: String(page), size: String(size) })}`, identityRequestsResponseSchema)).payload;
}

export function createIdentityRequest(input: CreateIdentityRequestInput) {
  return messageRequest("/identity-request", identityRequestResultSchema, input, "POST");
}

export async function decideIdentityRequest(requestId: string, input: DecideIdentityRequestInput) {
  return (await messageRequest(`/identity-request/${encodeURIComponent(requestId)}`, identityRequestResultSchema, input, "PATCH")).payload;
}

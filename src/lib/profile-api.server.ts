import "server-only";

import { z } from "zod";

import { backendUrl } from "@/lib/backend-api.server";
import { backendProfileError, ProfileApiError } from "@/features/profile/errors";
import { profileMessageSchema, profileResponseSchema, publicProfileResponseSchema } from "@/schema/profileSchema";
import type { UpdatePasswordInput } from "@/schema/updatePasswordSchema";
import type { UpdateProfileInput } from "@/schema/updateProfileSchema";
import { decryptToken } from "@/utils/decrypt-token";

async function backendRequest(path: string, token?: string, body?: unknown, method = "GET") {
  let response: Response;
  try {
    response = await fetch(backendUrl(path), {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ProfileApiError("Unable to reach the profile service.", 503);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw backendProfileError(payload, response.status, response.statusText);
  return payload;
}

function parseResponse<T extends z.ZodType>(schema: T, payload: unknown): z.output<T> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ProfileApiError("Invalid response from the profile service.", 502);
  return parsed.data;
}

export async function requireProfileToken() {
  const token = await decryptToken(true);
  if (!token) throw new ProfileApiError("Your session expired. Please sign in again.", 401);
  return token;
}

export function checkProfileOrigin(request: Request) {
  const origin = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (request.headers.get("origin") !== origin) {
    throw new ProfileApiError("Unable to submit this request.", 403);
  }
}

export async function readProfileInput<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  checkProfileOrigin(request);
  const payload: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ProfileApiError(parsed.error.issues[0].message, 400, parsed.error.issues.map((issue) => ({
      path: String(issue.path[0] ?? ""),
      message: issue.message,
    })));
  }
  return parsed.data;
}

export function profileErrorResponse(error: unknown) {
  const failure = error instanceof ProfileApiError ? error : new ProfileApiError("The profile service is unavailable.", 503);
  return Response.json({ message: failure.message, details: failure.details }, {
    status: failure.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function getProfile(token: string) {
  return parseResponse(profileResponseSchema, await backendRequest("/user/profile", token));
}

export async function getPublicProfile(id: string) {
  return parseResponse(publicProfileResponseSchema, await backendRequest(`/user/share-profile/${id}`));
}

export async function updateProfile(token: string, body: UpdateProfileInput) {
  return parseResponse(profileMessageSchema, await backendRequest("/user/update-profile", token, body, "PATCH"));
}

export async function updatePassword(token: string, body: UpdatePasswordInput) {
  return parseResponse(profileMessageSchema, await backendRequest("/user/update-password", token, body, "PATCH"));
}

export async function logoutProfile(token: string, all = false) {
  return parseResponse(profileMessageSchema, await backendRequest(`/user/logout${all ? "?flag=all" : ""}`, token, undefined, "PATCH"));
}

import type { z } from "zod";
import { signOut } from "next-auth/react";
import { renewSession } from "@/features/auth/renew-session";

import { backendProfileError, ProfileApiError } from "@/features/profile/errors";
import { passwordResultSchema, profileMessageSchema, profileResponseSchema } from "@/schema/profileSchema";
import type { UpdatePasswordInput } from "@/schema/updatePasswordSchema";
import type { UpdateProfileInput } from "@/schema/updateProfileSchema";

async function profileRequest<T extends z.ZodType>(path: string, schema: T, options?: RequestInit): Promise<z.output<T>> {
  let response = await fetch(path, { ...options, cache: "no-store" });
  let payload: unknown = await response.json().catch(() => null);
  if (!response.ok && backendProfileError(payload, response.status, response.statusText).message === "jwt expired") {
    response = await renewSession();
    if (response.ok) response = await fetch(path, { ...options, cache: "no-store" });
    payload = await response.clone().json().catch(() => null);
  }
  if (response.status === 401) {
    await signOut({ redirectTo: "/signin?error=SessionExpired" });
  }
  if (!response.ok) throw backendProfileError(payload, response.status, response.statusText);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ProfileApiError("Invalid response from the profile service.", 502);
  return parsed.data;
}

export async function fetchProfile(signal?: AbortSignal) {
  const result = await profileRequest("/api/profile", profileResponseSchema, { signal });
  return result.user;
}

export function saveProfile(values: UpdateProfileInput) {
  return profileRequest("/api/profile", profileMessageSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export function savePassword(values: UpdatePasswordInput) {
  return profileRequest("/api/profile/password", passwordResultSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export function logout(all: boolean) {
  return profileRequest(`/api/profile/logout${all ? "?flag=all" : ""}`, profileMessageSchema, { method: "PATCH" });
}

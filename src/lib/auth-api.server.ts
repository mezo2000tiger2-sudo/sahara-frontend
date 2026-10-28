import "server-only";

import { backendUrl } from "@/lib/backend-api.server";
import type { JWT } from "next-auth/jwt";
import { z } from "zod";

const tokenResponseSchema = z.object({ token: z.object({ token_access: z.string().min(1) }) });

export function tokenExpiresAt(token: string): number {
  // Expiry is scheduling metadata; Express verifies the token's signature.
  const payload: unknown = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  return z.object({ exp: z.number().int().positive() }).parse(payload).exp * 1000;
}

export function hasRefreshToken(token: JWT | null): token is JWT {
  return Boolean(token?.refreshToken && token.accessToken &&
    token.accessTokenExpiresAt && token.refreshTokenExpiresAt && token.refreshTokenExpiresAt > Date.now());
}

export async function refreshBackendToken(token: JWT, force = false): Promise<JWT | null> {
  if (!hasRefreshToken(token)) return null;
  if (!force && token.accessTokenExpiresAt! > Date.now() + 30_000) return { ...token, error: undefined, refreshError: undefined };

  try {
    const response = await fetch(backendUrl("/user/refresh-token"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token.refreshToken}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    
    console.log(response)
    const payload: unknown = await response.json().catch(() => null);
    console.log(payload)
    if (response.status === 401 || response.status === 404) return null;
    // The current backend reports JWT verification failures as HTTP 500.
    const failure = z.object({ error: z.string().optional(), message: z.string().optional() }).safeParse(payload);
    if (response.status === 500 && failure.success &&
      ["jwt expired", "invalid signature", "jwt malformed", "invalid token"].includes(failure.data.error ?? failure.data.message ?? "")) return null;
    if (!response.ok) return { ...token, error: "RefreshUnavailable", refreshError: {
      message: failure.success ? failure.data.error ?? failure.data.message ?? response.statusText : response.statusText,
      status: response.status,
    } };

    const accessToken = tokenResponseSchema.parse(payload).token.token_access;
    const accessTokenExpiresAt = tokenExpiresAt(accessToken);
    if (accessTokenExpiresAt <= Date.now() + 30_000) return { ...token, error: "RefreshUnavailable", refreshError: undefined };
    return { ...token, accessToken, accessTokenExpiresAt, error: undefined, refreshError: undefined };
  } catch {
    return { ...token, error: "RefreshUnavailable", refreshError: undefined };
  }
}

export type BackendResponse = {
  user?: { name?: string; email: string };
  token?: { token_access: string; token_refresh: string };
  error?: string;
  message?: string;
};



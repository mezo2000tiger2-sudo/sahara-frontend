import "server-only";

import { z } from "zod";
import { tokenExpiresAt } from "./auth-api.server";
import { backendUrl } from "./backend-api.server";

const unavailable = "Sign-in is unavailable right now. Please try again.";
const responseSchema = z.object({
  user: z.object({ email: z.string().min(1), name: z.string().optional() }),
  token: z.object({ token_access: z.string().min(1), token_refresh: z.string().min(1) }),
});
const errorSchema = z.object({ error: z.string().optional(), message: z.string().optional() });

export async function authenticateWithBackend(
  path: "/user/signin" | "/user/signup/gmail" | "/user/signup/github",
  body: Record<string, string>
) {
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(backendUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    payload = await response.json();
  } catch {
    throw new Error(unavailable);
  }

  if (!response.ok) {
    const failure = errorSchema.safeParse(payload);
    throw new Error(failure.success ? failure.data.error || failure.data.message || unavailable : unavailable);
  }

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new Error(unavailable);
  const { user, token } = parsed.data;
  let accessTokenExpiresAt: number;
  let refreshTokenExpiresAt: number;
  try {
    accessTokenExpiresAt = tokenExpiresAt(token.token_access);
    refreshTokenExpiresAt = tokenExpiresAt(token.token_refresh);
  } catch {
    throw new Error(unavailable);
  }
  if (accessTokenExpiresAt <= Date.now() || refreshTokenExpiresAt <= Date.now()) {
    throw new Error(unavailable);
  }

  return {
    id: user.email,
    name: user.name ?? null,
    email: user.email,
    accessToken: token.token_access,
    refreshToken: token.token_refresh,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

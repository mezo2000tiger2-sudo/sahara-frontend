import "server-only";

import { z } from "zod";
import { tokenExpiresAt } from "./auth-api.server";
import { backendUrl } from "./backend-api.server";

const responseSchema = z.object({
  user: z.object({ email: z.string().min(1), name: z.string().optional() }),
  token: z.object({ token_access: z.string().min(1), token_refresh: z.string().min(1) }),
});
const errorSchema = z.object({ error: z.unknown().optional(), message: z.unknown().optional() });

export async function authenticateWithBackend(
  path: "/user/signin" | "/user/signup/gmail" | "/user/signup/github",
  body: Record<string, string>
) {
  let response: Response;
  let payload: unknown;
  const signal = AbortSignal.timeout(10_000);
  try {
    response = await fetch(backendUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal,
    });
    payload = await response.json();
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw new Error("The sign-in request timed out. Please try again.");
    }
    if (error instanceof SyntaxError) {
      throw new Error("The sign-in server returned an invalid response.");
    }
    throw new Error("Could not connect to the sign-in server. Please try again.");
  }

  if (!response.ok) {
    const failure = errorSchema.safeParse(payload);
    if (failure.success) {
      const { error, message } = failure.data;
      if (typeof error === "string" && error.trim()) throw new Error(error);
      if (typeof message === "string" && message.trim()) throw new Error(message);
    }
    throw new Error(`The sign-in server rejected the request (HTTP ${response.status}).`);
  }

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new Error("The sign-in server returned an invalid response.");
  const { user, token } = parsed.data;
  let accessTokenExpiresAt: number;
  let refreshTokenExpiresAt: number;
  try {
    accessTokenExpiresAt = tokenExpiresAt(token.token_access);
    refreshTokenExpiresAt = tokenExpiresAt(token.token_refresh);
  } catch {
    throw new Error("The sign-in server returned invalid session tokens.");
  }
  if (accessTokenExpiresAt <= Date.now() || refreshTokenExpiresAt <= Date.now()) {
    throw new Error("The sign-in server returned an expired session. Please sign in again.");
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

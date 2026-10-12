import "server-only";

import { backendUrl } from "@/lib/backend-api.server";

type BackendResponse = {
  user?: { name?: string; email: string };
  token?: { token_access: string };
  error?: string;
  message?: string;
};

export async function authenticateWithBackend(
  path: "/user/signin" | "/user/signup/gmail" | "/user/signup/github",
  body: Record<string, string>,
) {
  const response = await fetch(backendUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json() as BackendResponse;

  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? response.statusText);
  }

  const accessToken = data.token?.token_access;
  if (typeof accessToken !== "string" || !accessToken || typeof data.user?.email !== "string") {
    throw new Error("service_unavailable");
  }

  return {
    id: data.user.email,
    name: typeof data.user.name === "string" ? data.user.name : null,
    email: data.user.email,
    accessToken,
  };
}

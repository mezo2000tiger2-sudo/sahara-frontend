import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { updateSession } from "@/auth";
import { hasRefreshToken, refreshBackendToken } from "@/lib/auth-api.server";

/** Read the backend access token from the encrypted Auth.js cookie. */
export async function readAuthToken() {
  return getToken({
    req: { headers: new Headers({ cookie: (await cookies()).toString() }) },
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.AUTH_URL?.startsWith("https://") ?? false,
  });
}

/** Route Handlers can persist renewed cookies; Server Components can only read them. */
export async function decryptToken(persist = false): Promise<string | null> {
  let token = await readAuthToken();
  if (!hasRefreshToken(token)) return null;
  if (token.accessTokenExpiresAt! <= Date.now() + 30_000) {
    if (persist) {
      await updateSession({});
      token = await readAuthToken();
    } else {
      // shortcut: server rendering cannot save cookies; the next API request persists renewal.
      token = await refreshBackendToken(token);
    }
  }
  if (token?.error === "RefreshUnavailable") throw new Error("Unable to renew your session. Please try again.");
  return hasRefreshToken(token) ? token.accessToken! : null;
}

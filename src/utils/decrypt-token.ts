import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

/** Read the backend access token from the encrypted Auth.js cookie. */
export async function decryptToken(): Promise<string | null> {
  const token = await getToken({
    req: { headers: new Headers({ cookie: (await cookies()).toString() }) },
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.AUTH_URL?.startsWith("https://") ?? false,
  });
  return token?.accessToken ?? null;
}

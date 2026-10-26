import { z } from "zod";

import { backendErrorSchema, backendUrl } from "@/lib/backend-api.server";
import { verifyEmailSchema } from "@/schema/verifyEmailSchema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const applicationOrigin = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (origin && origin !== applicationOrigin) {
    return Response.json({ message: "Unable to submit this request." }, { status: 403 });
  }

  const parsed = verifyEmailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: "Check your details.", fieldErrors: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  try {
    const response = await fetch(backendUrl("/user/confrimEmail"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.status === 200 && z.object({ message: z.literal("done") }).safeParse(payload).success) {
      return Response.json({ message: "done" });
    }
    const error = backendErrorSchema.safeParse(payload);
    if (!response.ok && error.success && error.data.error) {
      return Response.json({ message: error.data.error }, { status: response.status });
    }
    return Response.json({ message: "We could not confirm email verification. Please try signing in before submitting again." }, { status: 502 });
  } catch {
    return Response.json({ message: "Email verification is unavailable right now. Please try again." }, { status: 503 });
  }
}

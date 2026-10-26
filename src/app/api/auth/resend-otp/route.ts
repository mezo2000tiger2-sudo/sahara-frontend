import { z } from "zod";

import { backendErrorSchema, backendUrl } from "@/lib/backend-api.server";
import { resendOtpSchema } from "@/schema/verifyEmailSchema";

export const runtime = "nodejs";

const resendErrorSchema = backendErrorSchema.extend({
  details: z.union([z.string(), backendErrorSchema.shape.details.unwrap()]).optional(),
});

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  const applicationOrigin = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (origin && origin !== applicationOrigin) {
    return Response.json({ message: "Unable to submit this request." }, { status: 403 });
  }

  const parsed = resendOtpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: "Check your details.", fieldErrors: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  try {
    const response = await fetch(backendUrl("/user/resend-otp"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.status === 200 && z.object({ message: z.literal("Done") }).safeParse(payload).success) {
      return Response.json({ message: "Done" });
    }
    // Retry metadata must never hide an otherwise valid backend error message.
    const error = backendErrorSchema.omit({ details: true }).safeParse(payload);
    if (!response.ok && error.success && error.data.error) {
      const details = resendErrorSchema.safeParse(payload);
      const duration = details.success ? details.data.details : undefined;
      const seconds = typeof duration === "string" && /^[0-9]+$/.test(duration) ? Number(duration) : 0;
      const retryAfterSeconds = Number.isSafeInteger(seconds) && seconds > 0 && Number.isSafeInteger(Date.now() + seconds * 1000)
        ? seconds : undefined;
      return Response.json({ message: error.data.error, retryAfterSeconds }, { status: response.status });
    }
    return Response.json({ message: "We could not confirm that a new code was sent. Please try again." }, { status: 502 });
  } catch {
    return Response.json({ message: "Resending your code is unavailable right now. Please try again." }, { status: 503 });
  }
}

import { z } from "zod";

import { backendErrorSchema, backendUrl } from "@/lib/backend-api.server";
import { signUpSchema } from "@/schema/signupSchema";

export const runtime = "nodejs";

const fields = ["fName", "lName", "email", "password", "age", "gender", "phone", "avatar"] as const;

export async function POST(request: Request) {
  // Public signup is unauthenticated, but must originate from this application.
  const origin = request.headers.get("origin");
  const applicationOrigin = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (origin && origin !== applicationOrigin) {
    return Response.json({ message: "Unable to submit this request." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ message: "Unable to read the upload. Try a smaller image or submit without an avatar." }, { status: 400 });
  }

  const age = formData.get("age");
  const avatar = formData.get("avatar");
  const parsed = signUpSchema.safeParse({
    fName: formData.get("fName"),
    lName: formData.get("lName"),
    email: formData.get("email"),
    password: formData.get("password"),
    age: typeof age === "string" && age.trim() !== "" ? Number(age) : undefined,
    gender: formData.get("gender") || undefined,
    phone: formData.get("phone") || undefined,
    avatar: avatar instanceof File && avatar.size === 0 && avatar.name === "" ? undefined : avatar ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ message: "Check your details.", fieldErrors: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  const body = new FormData();
  for (const field of fields) {
    const value = parsed.data[field];
    if (value !== undefined) body.append(field, value instanceof File ? value : String(value));
  }

  try {
    const response = await fetch(backendUrl("/user/signup"), {
      method: "POST", body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.ok) {
      if (response.status !== 201 || !z.object({ message: z.literal("done") }).safeParse(payload).success) {
        return Response.json({ message: "We could not confirm account creation. Try signing in before submitting again." }, { status: 502 });
      }
      return Response.json({ message: "Account created." }, { status: 201 });
    }

    const error = backendErrorSchema.safeParse(payload);
    if (error.success) {
      const message = error.data.error ?? "";
      if (message.includes("E11000") && message.includes("email")) {
        return Response.json({ message: "This email is already registered.", fieldErrors: { email: ["This email is already registered."] } }, { status: 409 });
      }
      if (response.status === 400 && error.data.details) {
        const fieldErrors: Record<string, string[]> = {};
        for (const detail of error.data.details) {
          if (fields.some((field) => field === detail.path)) {
            (fieldErrors[detail.path] ??= []).push(detail.message);
          }
        }
        return Response.json({ message: "Check your details.", fieldErrors }, { status: 400 });
      }
      if (message === "Unexpected field") {
        return Response.json({ message: "Unable to upload the avatar. Choose one image and try again.", fieldErrors: { avatar: ["Choose one avatar image."] } }, { status: 400 });
      }
    }
    return Response.json({ message: "Unable to create your account. Please try again." }, { status: 502 });
  } catch {
    return Response.json({ message: "Signup is unavailable right now. Please try again. If you already submitted, try signing in before submitting again." }, { status: 503 });
  }
}

import { z } from "zod";

import { ProfileApiError } from "@/features/profile/errors";
import { backendErrorSchema, backendUrl } from "@/lib/backend-api.server";
import { backendCreateMessageResponseSchema, createMessageSchema } from "@/schema/createMessageSchema";
import { decryptToken } from "@/utils/decrypt-token";

export const runtime = "nodejs";

const messageErrorSchema = backendErrorSchema.omit({ details: true }).extend({
  message: z.string().optional(),
  details: z.unknown().optional(),
});

export async function POST(request: Request) {
  const applicationOrigin = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (request.headers.get("origin") !== applicationOrigin) {
    return Response.json({ message: "Unable to submit this request." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ message: "Unable to read the message upload." }, { status: 400 });
  }

  const parsed = createMessageSchema.safeParse({
    recevierId: formData.get("recevierId"),
    content: formData.get("content") ?? undefined,
    identity: formData.get("identity") ?? undefined,
    attachments: formData.getAll("attachments").filter((file) =>
      !(file instanceof File && file.size === 0 && file.name === "" && file.type === "application/octet-stream"),
    ),
  });
  if (!parsed.success) {
    return Response.json({
      message: parsed.error.issues[0].message,
      details: parsed.error.issues.map((issue) => ({ path: String(issue.path[0] ?? ""), message: issue.message })),
    }, { status: 400 });
  }

  try {
    const headers = new Headers();
    if (parsed.data.identity === "identified") {
      const token = await decryptToken(true);
      if (!token) {
        return Response.json({ message: "Your session expired. Please sign in again." }, { status: 401 });
      }
      headers.set("Authorization", `Bearer ${token}`);
    }

    const body = new FormData();
    body.append("recevierId", parsed.data.recevierId);
    if (parsed.data.content !== undefined) body.append("content", parsed.data.content);
    for (const file of parsed.data.attachments) body.append("attachments", file);

    const response = await fetch(backendUrl("/message/create-message"), {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = messageErrorSchema.safeParse(payload);
      return Response.json({
        message: error.success ? error.data.error ?? error.data.message ?? response.statusText : response.statusText,
        details: error.success ? error.data.details : undefined,
      }, { status: response.status });
    }
    if (response.status !== 200 || !backendCreateMessageResponseSchema.safeParse(payload).success) {
      return Response.json({ message: "We could not confirm that your message was sent." }, { status: 502 });
    }
    return Response.json({ message: "Message sent." });
  } catch (error) {
    if (error instanceof ProfileApiError) {
      return Response.json({ message: error.message, details: error.details }, { status: error.status });
    }
    return Response.json({ message: "We could not confirm that your message was sent. The service may be unavailable." }, { status: 503 });
  }
}

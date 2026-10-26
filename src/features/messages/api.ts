import { backendProfileError, ProfileApiError } from "@/features/profile/errors";
import { createMessageResponseSchema, type CreateMessageInput } from "@/schema/createMessageSchema";

export async function sendMessage(values: CreateMessageInput) {
  const body = new FormData();
  body.set("recevierId", values.recevierId);
  body.set("identity", values.identity);
  if (values.content) body.set("content", values.content);
  for (const attachment of values.attachments) body.append("attachments", attachment);

  const response = await fetch("/api/messages", { method: "POST", body });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw backendProfileError(payload, response.status, response.statusText);
  const parsed = createMessageResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ProfileApiError("Invalid response from the message service.", 502);
  return parsed.data;
}

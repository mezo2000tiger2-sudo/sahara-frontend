import { z } from "zod";
import { checkProfileOrigin } from "@/lib/profile-api.server";
import { ProfileApiError } from "@/features/profile/errors";
import { messageErrorResponse, messageJson, messageRequest, parseMessageInput, readMessageInput } from "@/lib/messages-api.server";
import { backendConversationMessagesResponseSchema, backendSendConversationMessageResponseSchema, conversationListInputSchema, sendConversationMessageSchema } from "@/schema/conversationSchema";
import { objectIdSchema } from "@/schema/messageSchema";

type Context = { params: Promise<{ conversationId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const conversationId = parseMessageInput(objectIdSchema, (await params).conversationId);
    const input = parseMessageInput(conversationListInputSchema, Object.fromEntries(new URL(request.url).searchParams));
    const result = await messageRequest(`/conversation/${encodeURIComponent(conversationId)}/messages?${new URLSearchParams({ page: String(input.page), size: String(input.size) })}`, backendConversationMessagesResponseSchema);
    return messageJson(result.payload);
  } catch (error) {
    return messageErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const conversationId = parseMessageInput(objectIdSchema, (await params).conversationId);
    parseMessageInput(z.object({}).strict(), Object.fromEntries(new URL(request.url).searchParams));
    checkProfileOrigin(request);
    let input;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await request.formData().catch(() => null);
      if (!form || [...form.keys()].some((key) => !["content", "attachments"].includes(key)) || form.getAll("content").length > 1) {
        throw new ProfileApiError("Invalid message upload.", 400);
      }
      input = parseMessageInput(sendConversationMessageSchema, {
        content: form.get("content") ?? "",
        attachments: form.getAll("attachments"),
      });
    } else {
      input = await readMessageInput(request, sendConversationMessageSchema);
    }
    const body = new FormData();
    if (input.content) body.append("content", input.content);
    for (const file of input.attachments) body.append("attachments", file);
    const result = await messageRequest(`/conversation/${encodeURIComponent(conversationId)}/messages`, backendSendConversationMessageResponseSchema, body, "POST");
    return messageJson(result.payload, { status: result.status });
  } catch (error) {
    return messageErrorResponse(error);
  }
}

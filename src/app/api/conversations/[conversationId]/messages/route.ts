import { z } from "zod";
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
    const input = await readMessageInput(request, sendConversationMessageSchema);
    const result = await messageRequest(`/conversation/${encodeURIComponent(conversationId)}/messages`, backendSendConversationMessageResponseSchema, input, "POST");
    return messageJson(result.payload, { status: result.status });
  } catch (error) {
    return messageErrorResponse(error);
  }
}

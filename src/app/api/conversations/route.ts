import { messageErrorResponse, messageJson, messageRequest, parseMessageInput } from "@/lib/messages-api.server";
import { conversationListInputSchema, conversationsResponseSchema } from "@/schema/conversationSchema";

export async function GET(request: Request) {
  try {
    const input = parseMessageInput(conversationListInputSchema, Object.fromEntries(new URL(request.url).searchParams));
    const result = await messageRequest(`/conversation?${new URLSearchParams({ page: String(input.page), size: String(input.size) })}`, conversationsResponseSchema);
    return messageJson(result.payload);
  } catch (error) {
    return messageErrorResponse(error);
  }
}

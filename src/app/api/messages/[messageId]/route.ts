import { getMessage, messageErrorResponse, messageJson, parseMessageInput } from "@/lib/messages-api.server";
import { objectIdSchema } from "@/schema/messageSchema";

export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await params;
    return messageJson(await getMessage(parseMessageInput(objectIdSchema, messageId)));
  } catch (error) {
    return messageErrorResponse(error);
  }
}

import { decideIdentityRequest, messageErrorResponse, messageJson, parseMessageInput, readMessageInput } from "@/lib/messages-api.server";
import { decideIdentityRequestSchema } from "@/schema/identityRequestSchema";
import { objectIdSchema } from "@/schema/messageSchema";

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params;
    const id = parseMessageInput(objectIdSchema, requestId);
    const input = await readMessageInput(request, decideIdentityRequestSchema);
    return messageJson(await decideIdentityRequest(id, input));
  } catch (error) {
    return messageErrorResponse(error);
  }
}

import { createIdentityRequest, getIdentityRequests, messageErrorResponse, messageJson, readMessageInput, readMessageListInput } from "@/lib/messages-api.server";
import { createIdentityRequestSchema } from "@/schema/identityRequestSchema";

export async function GET(request: Request) {
  try {
    return messageJson(await getIdentityRequests(readMessageListInput(request)));
  } catch (error) {
    return messageErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await readMessageInput(request, createIdentityRequestSchema);
    const result = await createIdentityRequest(input);
    return messageJson(result.payload, { status: result.status });
  } catch (error) {
    return messageErrorResponse(error);
  }
}

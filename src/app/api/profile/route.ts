import { getProfile, profileErrorResponse, readProfileInput, requireProfileToken, updateProfile } from "@/lib/profile-api.server";
import { updateProfileSchema } from "@/schema/updateProfileSchema";

export async function GET() {
  try {
    return Response.json(await getProfile(await requireProfileToken()), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const values = await readProfileInput(request, updateProfileSchema);
    const result = await updateProfile(await requireProfileToken(), values);
    return Response.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

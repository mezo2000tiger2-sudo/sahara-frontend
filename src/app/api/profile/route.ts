import { checkProfileOrigin, getProfile, profileErrorResponse, readProfileImageInput, readProfileInput, requireProfileToken, updateProfile } from "@/lib/profile-api.server";
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
    checkProfileOrigin(request);
    const token = await requireProfileToken();
    const values = /^multipart\/form-data(?:;|$)/i.test(request.headers.get("content-type") ?? "")
      ? await readProfileImageInput(request)
      : await readProfileInput(request, updateProfileSchema);
    const result = await updateProfile(token, values);
    return Response.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

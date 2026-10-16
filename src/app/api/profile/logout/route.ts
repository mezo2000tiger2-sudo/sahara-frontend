import { signOut } from "@/auth";
import { ProfileApiError } from "@/features/profile/errors";
import { checkProfileOrigin, logoutProfile, profileErrorResponse, requireProfileToken } from "@/lib/profile-api.server";

export async function PATCH(request: Request) {
  try {
    checkProfileOrigin(request);
    const flag = new URL(request.url).searchParams.get("flag");
    if (flag !== null && flag !== "all") throw new ProfileApiError("Invalid logout option.", 400);
    const result = await logoutProfile(await requireProfileToken(), flag === "all");
    await signOut({ redirect: false });
    return Response.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

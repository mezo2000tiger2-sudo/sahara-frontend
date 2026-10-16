import { signOut } from "@/auth";
import { ProfileApiError } from "@/features/profile/errors";
import { logoutProfile, profileErrorResponse, readProfileInput, requireProfileToken, updatePassword } from "@/lib/profile-api.server";
import { updatePasswordSchema } from "@/schema/updatePasswordSchema";

export async function PATCH(request: Request) {
  try {
    const values = await readProfileInput(request, updatePasswordSchema);
    const token = await requireProfileToken();
    const result = await updatePassword(token, values);
    let logoutError: string | undefined;
    try {
      await logoutProfile(token);
    } catch (error) {
      // A backend that invalidates tokens on password change has already revoked this session.
      if (!(error instanceof ProfileApiError && error.status === 401)) {
        logoutError = error instanceof Error ? error.message : String(error);
      }
    }
    await signOut({ redirect: false });
    return Response.json({ ...result, logoutError }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

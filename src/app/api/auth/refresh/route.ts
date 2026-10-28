import { updateSession } from "@/auth";
import { checkProfileOrigin, profileErrorResponse } from "@/lib/profile-api.server";

export async function POST(request: Request) {
  try {
    checkProfileOrigin(request);
    const session = await updateSession({});
    if (!session) return Response.json({ message: "Your session expired. Please sign in again." }, { status: 401 });
    if (session.error) return Response.json({ message: session.refreshError?.message ?? "Unable to renew your session. Please try again." }, {
      status: session.refreshError?.status ?? 503,
    });
    return Response.json({ message: "done" });
  } catch (error) {
    return profileErrorResponse(error);
  }
}

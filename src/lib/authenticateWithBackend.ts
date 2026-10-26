import { BackendResponse, tokenExpiresAt } from "./auth-api.server";
import { backendUrl } from "./backend-api.server";


export async function authenticateWithBackend(
    path: "/user/signin" | "/user/signup/gmail" | "/user/signup/github",
    body: Record<string, string>
) {
    const response = await fetch(backendUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    const data = await response.json() as BackendResponse;

    if (!response.ok) {
        throw new Error(data.error ?? data.message ?? response.statusText);
    }

    const accessToken = data.token?.token_access;
    const refreshToken = data.token?.token_refresh;
    if (typeof accessToken !== "string" || !accessToken || typeof refreshToken !== "string" ||
        !refreshToken || typeof data.user?.email !== "string") {
        throw new Error("service_unavailable");
    }

    return {
        id: data.user.email,
        name: typeof data.user.name === "string" ? data.user.name : null,
        email: data.user.email,
        accessToken,
        refreshToken,
        accessTokenExpiresAt: tokenExpiresAt(accessToken),
        refreshTokenExpiresAt: tokenExpiresAt(refreshToken),
    };
}

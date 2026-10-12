export type CredentialsErrorCode =
  | "invalid_credentials"
  | "account_unconfirmed"
  | "service_unavailable";

export function authenticationErrorMessage(error?: string, code?: string) {
  if (!error) return undefined;
  if (code !== undefined && (error === "GitHubBackendError" || error === "GoogleBackendError" || error === "CredentialsSignin")) {
    return code;
  }
  if (error === "GitHubBackendError") {
    return "GitHub sign-in succeeded, but the backend could not complete your login. Please try again.";
  }
  if (error === "GitHubAccessTokenMissing") {
    return "GitHub did not return an access token. Please start GitHub sign-in again.";
  }
  if (error === "GoogleBackendError") {
    return "Google sign-in succeeded, but the backend could not complete your login. Please try again.";
  }
  if (error === "GoogleIdTokenMissing") {
    return "Google did not return an ID token. Please start Google sign-in again.";
  }
  if (error === "CredentialsSignin") {
    if (code === "account_unconfirmed") return "Your account needs activation before you can sign in.";
    if (code === "service_unavailable") return "Sign-in is unavailable right now. Please try again.";
    return "The email or password is incorrect.";
  }
  if (error === "AccessDenied" || error === "OAuthAccountNotLinked") {
    return "Social sign-in could not be completed. Try again or use your email and password.";
  }
  return "Unable to complete sign-in. Please try again.";
}

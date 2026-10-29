# Authentication

Auth.js Credentials signin, Google OAuth, and GitHub OAuth are connected to the existing
Express endpoints. Custom `/signup` and `/signin` pages use React Hook Form and
Zod. The auth layout redirects signed-in visitors to `/`.

`src/schema/signupSchema.ts` follows the supplied Joi contract: ASCII alphanumeric first name,
2–50 character names, email up to 50 characters without a TLD allowlist, a required
non-empty password, numeric age from 18 to 120, optional male/female gender, and
optional non-empty phone. Numeric conversion happens in the form and API route; the
schema does not silently coerce strings or add integer/password-strength rules.

`avatar` is an optional single `File`. The current Postman collection contains a
JSON signup example without avatar/upload constraints. The form additionally
supports a single optional avatar image, validated by image MIME type. File-size
restrictions remain unspecified; deployment upload limits still apply.

Email signup sends FormData through `POST /api/auth/signup` to Express
`/user/signup`. The route validates again, omits blank optional fields and
confirmation, and lets fetch generate the multipart boundary. It returns only
`{ message }` on success or `{ message, fieldErrors? }` on failure, with string
arrays for field errors; the backend's full user document is never forwarded.

Successful email signup saves the returned success message in
`src/context/auth-message-context.tsx` and redirects to `/verify-email` with the
signup email prefilled, without a session.
The provider lives above the auth template, preserving messages between forms.
Both forms and the social buttons use `useAuthMessage()` for shared banners;
React Hook Form still owns inline validation and server field errors. Messages
clear before email submission, when using the link between forms, or on refresh.
Google callback messages keep their existing query parameters and mapping.
No message cookies or storage are used.
Email verification sends `{ email, otp }` through `POST /api/auth/confirm-email`
to Express `POST /user/confrimEmail`. HTTP 200 `{ message: "done" }` confirms
the account and redirects to sign-in. The database's age maximum is 60, conflicting
with Joi; the frontend keeps the requested 18–120 validation range.

`signUpFormSchema` additionally checks `cPassword`. Confirmation is not part of
the backend contract and must not be sent to Express.

`src/schema/signinSchema.ts` reuses the email/password field rules for signin.

## Resend verification code

On `/verify-email`, use **Resend code** if the signup email did not arrive or the
code expired. Resending validates only the email, not the OTP. The browser sends
`PATCH /api/auth/resend-otp` with `{ email }`; the server validates again and
forwards only that field to `PATCH /user/resend-otp`. HTTP 200 with
`{ message: "Done" }` is the only accepted success (capital D, unlike confirmation).
The old OTP field clears after success and the user stays on verification.

Signup and successful resend start a 120-second wait. Absolute deadlines are
saved per email in `sessionStorage`, so refresh and switching emails preserve
remaining time within the tab. Expired entries are removed. The backend remains
responsible for expiry and abuse prevention; the displayed deadline is an estimate
from the successful response, not a server-provided expiration timestamp.
Storage failures do not interrupt authentication: resend timers continue in page
memory, but refreshing loses them and the initial signup wait cannot be restored.

Backend errors retain their original status and text. A positive integer string
in backend `details` becomes numeric `retryAfterSeconds` in the frontend response
and starts the corresponding countdown. Invalid, missing, negative, fractional,
or overflowing retry metadata is ignored without hiding the error. Validation
detail arrays are also accepted. No time is inferred from error-message text;
backend cooldown or maximum-attempt errors without numeric details therefore
display without an exact countdown. The backend must set `error.details`
explicitly before throwing a block error.

Verification remains available during a countdown. In-flight verification and
resend requests share a lock, preventing double-clicks and overlapping requests.
No resend request runs automatically on mount, refresh, or countdown expiry.

Auth.js in `src/auth.ts` uses Credentials, Google, and GitHub with JWT sessions. All
providers use `src/lib/auth-api.server.ts` to authenticate against Express.
Google's ID token is exchanged for an application token before session creation.
The application token remains inside the encrypted cookie and is excluded from
public session responses.
Auth.js handles encryption and session expiry; Express verifies the backend
token when it is used. No database adapter is used.

The encrypted cookie stores `accessToken`, `refreshToken`, and their expiry times.
The existing frontend `AUTH_SECRET` protects it; no new environment secret is
needed. Both tokens stay out of public session responses and browser storage APIs.
Backend signing secrets stay on the backend.

Sessions last seven days, but the refresh token's original expiry is checked
separately. With 30 seconds or less remaining on the access token, the server
sends `POST /user/refresh-token` with `Authorization: Bearer <refresh token>` and
no body. Only the access token is replaced; the refresh token is reused.

The Auth.js JWT callback and token reader share refresh logic in
`src/lib/auth-api.server.ts`. Profile Route Handlers use `decryptToken(true)` to
save renewal through Auth.js. Server Components use `decryptToken()` to renew for
the current render; they cannot write cookies, so the next profile API request
saves renewal. Concurrent requests may each refresh; the backend accepts reuse.

Expired or rejected refresh tokens require sign-in again. Profile API HTTP 401
responses clear the local session and navigate to `/signin?error=SessionExpired`,
discarding the client query cache. Temporary refresh failures preserve the cookie
and show a retryable error. Old cookies without refresh-token fields require
sign-in once. There is no browser refresh endpoint or automatic mutation replay.

Google or GitHub from either page creates a session and redirects directly to `/`.
Credentials signin preserves the backend error message in the Auth.js result's
`code` field. With `redirect: false`, the form saves that text in context and
displays it unchanged; the browser stays at `/signin`. Google callback errors
and GitHub backend errors use the existing query parameters, carrying the raw
backend message in `code` and displaying it unchanged through the message context.

Live Google OAuth requires configured credentials and a real account.
Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for the built-in Google provider.

Backend sign-in exchanges have a 10-second timeout and reject redirects.
Transport failures, invalid responses, and malformed or expired tokens show a
readable service-unavailable message. Backend error messages remain unchanged.
Run `node --test scripts/signin.test.mjs` for the focused regression checks.

GitHub uses `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` with the built-in
`read:user user:email` scopes. Set the OAuth app callback URL to
`http://localhost:3001/api/auth/callback/github` locally, or the frontend's
production origin followed by `/api/auth/callback/github`.
The server exchanges GitHub's `account.access_token` through
`POST /user/signup/github` as `{ accessToken }`. The returned backend
`token.token_access` and `token.token_refresh` are stored in the encrypted cookie. The backend handles
new and existing GitHub accounts and rejects accounts with a different provider.

## Backend token for other operations

Use `await decryptToken()` from `@/utils/decrypt-token` in a Server Component,
Server Action, or Route Handler. It reads and decrypts the Auth.js cookie,
supports chunked HTTP/HTTPS cookies, and returns the backend token or `null`
for missing, invalid, or expired sessions. Check for `null` before calling a
protected backend endpoint. Never return the token to the browser or log it.

## Profile actions

Profile handlers use this token helper and clear the Auth.js cookie after
confirmed backend logout. A successful password update also attempts current-token
revocation before clearing the cookie. If that follow-up fails, the sign-in page
preserves the backend error through `error=ProfileLogoutError&code=...` and separately
states that the password was saved.
See [the profile guide](../profile/README.md) for the full integration and backend report.

Backend limitations remain unchanged: refresh bypasses revocation and
credential-change checks, renewed access tokens omit the logout `jti`, and JWT
errors can return HTTP 500. The password-change handler also has missing awaits
and does not persist its credential-change timestamp. Frontend renewal cannot
guarantee server-side invalidation of copied refresh tokens.

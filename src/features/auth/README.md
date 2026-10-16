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
`src/context/auth-message-context.tsx` and redirects to `/signin` without a session.
The provider lives above the auth template, preserving messages between forms.
Both forms and the social buttons use `useAuthMessage()` for shared banners;
React Hook Form still owns inline validation and server field errors. Messages
clear before email submission, when using the link between forms, or on refresh.
Google callback messages keep their existing query parameters and mapping.
No message cookies or storage are used.
Accounts require manual `isConfirmed: true` database activation until a backend
confirmation endpoint exists. The database's age maximum is 60, conflicting
with Joi; the frontend keeps the requested 18–120 validation range.

`signUpFormSchema` additionally checks `cPassword`. Confirmation is not part of
the backend contract and must not be sent to Express.

`src/schema/signinSchema.ts` reuses the email/password field rules for signin.

Auth.js in `src/auth.ts` uses Credentials, Google, and GitHub with JWT sessions. All
providers use `src/lib/auth-api.server.ts` to authenticate against Express.
Google's ID token is exchanged for an application token before session creation.
The application token remains inside the encrypted cookie and is excluded from
public session responses. The only custom cookie field is `accessToken`.
Auth.js handles encryption and session expiry; Express verifies the backend
token when it is used. No refresh endpoint or database adapter is used.

Google or GitHub from either page creates a session and redirects directly to `/`.
Credentials signin preserves the backend error message in the Auth.js result's
`code` field. With `redirect: false`, the form saves that text in context and
displays it unchanged; the browser stays at `/signin`. Google callback errors
and GitHub backend errors use the existing query parameters, carrying the raw
backend message in `code` and displaying it unchanged through the message context.

Live Google OAuth requires configured credentials and a real account.

GitHub uses `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` with the built-in
`read:user user:email` scopes. Set the OAuth app callback URL to
`http://localhost:3001/api/auth/callback/github` locally, or the frontend's
production origin followed by `/api/auth/callback/github`.
The server exchanges GitHub's `account.access_token` through
`POST /user/signup/github` as `{ accessToken }`. Only the returned backend
`token.token_access` is stored as the custom JWT token. The backend handles
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
states that the password was saved. No refresh-token or expiry behavior was changed.
See [the profile guide](../profile/README.md) for the full integration and backend report.

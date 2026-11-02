# Profile integration

The profile feature consumes the existing Express API. The contract was reviewed
in the [Saharah Postman collection](https://go.postman.co/collection/51167906-96fc6bac-264f-40b0-8b6b-ad9b868b0bdf)
and checked against the local backend source. The collection has no saved response
examples for these operations, so response envelopes follow the backend code.

## Pages

- `/profile`: authenticated owner details, sharing, password navigation, and logout.
- `/profile/edit`: React Hook Form with `src/schema/updateProfileSchema.ts`.
- `/profile/password`: React Hook Form with `src/schema/updatePasswordSchema.ts`.
- `/profile/[id]`: public name, email, phone, age, and gender, as requested.

The shared layout provides the header and page shell without an authentication
guard. Each private page uses the client `ProfileLoader` to fetch its initial
profile through `/api/profile`, where the server checks the cookie. The public
page validates its ID and calls Express without a token.
Public profiles are excluded from search indexing through page metadata.

## Routes and services

| Browser route | Express endpoint | Success |
| --- | --- | --- |
| `GET /api/profile` | `GET /user/profile` | 200, `{ message, user }` |
| `PATCH /api/profile` | `PATCH /user/update-profile` | 201, `{ message }` |
| `PATCH /api/profile/password` | `PATCH /user/update-password` | 201, `{ message, logoutError? }` |
| `PATCH /api/profile/logout` | `PATCH /user/logout` | 201, `{ message }` |
| `PATCH /api/profile/logout?flag=all` | `PATCH /user/logout?flag=all` | 201, `{ message }` |
| Server-rendered `/profile/[id]` | `GET /user/share-profile/:id` | 200, allowlisted public profile |

`src/lib/profile-api.server.ts` owns backend requests, timeouts, input validation,
and safe response parsing. It reuses `backendUrl()` and `decryptToken()`. Backend
access tokens are never returned to the browser. Mutation handlers require the
configured frontend origin (`AUTH_URL`, or the request origin when unconfigured).

`api.ts` contains browser fetch functions. `queries.ts` provides the private
`["profile", "me"]` query with a 60-second stale time and no automatic retries.
Initial loads and subsequent requests share the browser QueryClient. A backend
`jwt expired` response triggers one cookie renewal and one retry of the rejected
request, with a loading screen during renewal. Other backend errors are preserved.

Backend requests and browser API responses use `no-store`. Failed backend requests
preserve their status and display `error ?? message` verbatim. Validation detail
messages are also preserved. Only transport failures, invalid backend responses,
and frontend validation use locally generated errors.

## Updates and session cleanup

Profile updates send only changed `fName`, `lName`, `age`, `gender`, and `phone`.
Email is read-only. Unknown fields are rejected; the backend has no removal
contract for optional fields. Validation follows the existing signup field rules,
including ages 18–120, without changing the backend's different database limit.
After saving, the query is invalidated and refetched, rather than using
`updatedUser`, whose phone remains encrypted. Background read failures keep mounted
forms and their unsaved values available.

Password confirmation is validated only by the form. The API receives exactly
`{ oldpassword, newpassword }`. Social accounts show provider instructions instead
of the password form. After a successful password save, the handler attempts
current-token revocation and clears the local Auth.js cookie. If revocation fails,
the sign-in page displays the exact backend error and a separate password-saved
notice. A 401 during that follow-up means the token is already invalid.

Device logout clears the Auth.js cookie only after Express confirms success.
All-device logout requires an in-page confirmation. On completed logout or
password change, pending queries are cancelled, the browser cache is cleared,
and navigation to sign-in reloads the application. Existing backend failures
are documented in [backend-issues.md](backend-issues.md).

## Avatar and cover images

Private `/profile` shows a plus button beside the avatar and an Add/Change cover
button. Choosing one nonempty PNG/JPEG saves immediately. Cancel does nothing;
inputs reset so the same file can be selected again. Both controls remain disabled
until saving and the subsequent profile refresh finish. There is no cropping,
removal, optimistic preview, new dependency, or additional file-size limit.

`saveProfileImage({ field, file })` reuses the existing request/session-renewal
helper. `PATCH /api/profile` accepts either the existing personal-details JSON or
multipart FormData with exactly one `avatar` or `coverImage` file. Origin and
authentication are checked before multipart parsing. The server rejects duplicate,
unknown, text, empty, unsupported, or combined entries and rebuilds approved
FormData. Fetch generates the multipart boundary. Success returns only `{ message }`;
backend error text and status are preserved.

The existing `["profile", "me"]` query is invalidated and awaited after saving.
A refresh failure retains the cached profile and reports that saving succeeded,
with a Retry refresh button. A failed refresh never turns a successful upload into
an upload error. Legacy strings and arrays of `{ url, publicId }` normalize to one
URL (first array entry); missing/null/empty values become null. Storage identifiers
are discarded. Both private and shared profiles display images; shared profiles
hide upload controls even for their owner. Broken avatars use initials; missing or
broken covers use the themed blue gradient.

The backend must use singular `coverImage` in both update and replacement cleanup.
This is already present in the sibling backend working tree, which this change
preserves. Slow/large uploads remain subject to hosting limits and the existing
10-second backend timeout.

## Verification

Run `node scripts/check-profile-images.mjs` for focused schema, route, forwarding,
renewal replay, and response-projection checks. For an isolated browser fixture,
run `npm run styles` then `node scripts/profile-review-server.mjs` and visit
`http://127.0.0.1:4012/__review/login`. This uses generated local session credentials
and an in-memory backend; it never uploads to real storage. Stop it with Ctrl+C.
See [image-upload-verification.md](image-upload-verification.md) for actual results
and remaining live-verification limits.

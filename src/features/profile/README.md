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
guard. Each private page uses `ProfileLoader` to check the cookie and fetch its
initial profile. The public page validates its ID and calls Express without a token.
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
Each server render creates its own QueryClient, loads Express directly, and
hydrates only the allowlisted profile into the existing browser provider. It
never calls the application's own HTTP routes from a Server Component.

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

## Deferred work and verification

Avatar circles show the first two uppercase letters of the name at the existing
dimensions. `AvatarImage` is intentionally commented out. Image loading, uploads,
covers, refresh tokens, and changes to token expiry are deferred.

No tests were added or run. Browser checks, lint, typecheck, and build were also
not run, following the user's instruction. No live backend mutations or Postman
collection runs were performed.

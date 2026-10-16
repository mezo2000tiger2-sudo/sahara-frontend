# Saharah frontend

Next.js App Router and TypeScript foundation for Saharah. The backend is a separate
Express project. This frontend will consume its endpoints only; it has no direct
database access.

## Current scope

- Tailwind CSS compiled through its official CLI, with shadcn UI components.
- Light/dark theme provider and toggle, using shadcn's next-themes setup.
- Motion configured with reduced-motion support.
- English-only interface with text directly in the components.
- React Hook Form, Zod, and Auth.js installed.
- TanStack Query configured for browser queries and mutations.
- Auth.js Credentials and Google providers call the existing Express endpoints.
- Backend access tokens stay in Auth.js's encrypted HttpOnly session cookies.
- Signup/signin forms use React Hook Form and Joi-compatible Zod validation.
- Email signup forwards multipart form data with an optional avatar image.
- Google authentication is available on both pages and creates a session directly.
- A public release placeholder at `/`.
- Authenticated profiles with separate edit/password pages, public sharing, and device logout.

The custom pages are `/signup` and `/signin`. Signed-in visitors are redirected
from these pages to `/`. Email accounts need manual activation in the database
(`isConfirmed: true`) until the backend adds a confirmation endpoint.

Profile pages are `/profile`, `/profile/edit`, `/profile/password`, and the public
`/profile/[id]`. See [the profile integration guide](src/features/profile/README.md)
for routes, schemas, fetching, deferred work, and known backend issues.

## Local setup

Use Node.js 20.9 or newer and npm. Node.js 24 is used for this setup.

1. Run `npm install`.
2. Copy `.env.example` to `.env` if starting from a fresh checkout.
3. Generate a random `AUTH_SECRET` locally; do not commit it.
4. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for the Google provider.
5. Run `npm run dev` and open http://localhost:3001.

The local `.env` created during initialization contains a random `AUTH_SECRET`.
Express defaults to port 3000; the frontend runs on port 3001. In Google Cloud,
register `http://localhost:3001/api/auth/callback/google` as an authorized redirect
URI on the OAuth client accepted by Express.

## Commands

- `npm run dev`: generate Tailwind CSS, then watch styles and run Next.js.
- `npm run styles`: compile Tailwind and shadcn styles once.
- `npm run build`: generate styles and build Next.js for production.
- `npm start`: serve the production build on port 3001.
- `npm run lint`: run ESLint.
- `npm run typecheck`: generate Next.js route types and check TypeScript.

`src/app/globals.css` is the Tailwind/shadcn source. The CLI produces
`src/app/tailwind.generated.css`, which the root layout imports. The generated
file is ignored by Git. No project PostCSS configuration or Tailwind PostCSS
plugin is used. Next.js may retain PostCSS as an internal dependency.

## Structure

- `src/auth.ts`: Credentials/Google providers and private JWT session callbacks.
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js handler exports.
- `src/schema/signupSchema.ts`: signup and frontend confirmation schemas.
- `src/schema/signinSchema.ts`: email/password signin validation.
- `src/lib/auth-api.server.ts`: backend authentication and response normalization.
- `src/types/next-auth.d.ts`: private token and public session types.
- `src/features/auth/README.md`: validation and future integration contract.
- `src/components/ui`: generated shadcn components.
- `src/components/providers.tsx`: theme, Motion, and TanStack Query providers.

## Authentication integration

Credentials calls `/user/signin`. The Google provider exchanges the verified
Google ID token through `/user/signup/gmail` before creating an application
session and redirecting to `/`. Email signup calls the Next.js
`/api/auth/signup` route, which validates and forwards multipart form data to
`/user/signup`. An optional avatar is sent under `avatar`; password confirmation
is never forwarded. Successful email signup saves the returned message in auth
context and redirects to `/signin` without creating a session. Password hashing
remains in Express. Shared banners use an in-memory context; field errors remain
in React Hook Form. Messages clear before email submission, when using the link
between forms, or on refresh. Google callback messages and Auth.js remain unchanged.

Signup errors are normalized to readable form and field errors. Credentials signin
preserves the backend error text in the Auth.js result. The form saves that text
in context and displays it unchanged, without navigating to an error query URL.
Google callback messages retain their existing mapping. Tokens stay server-only.

The frontend follows the requested age range of 18–120. The current backend
database model only accepts ages through 60; its validation must be aligned
separately. Avatar validation checks image MIME type; no file-size limit is
specified by the backend, and deployment upload limits still apply.

Backend access tokens remain inside encrypted HttpOnly Auth.js session cookies
and are not exposed in browser-visible session responses. Auth.js handles cookie
encryption and session expiry with a five-minute maxAge. The only custom JWT
field is `accessToken`. Express checks that token on protected requests; the
frontend does not parse its claims or refresh it.

The current backend response contract is
`{ user: { name, email }, token: { token_access } }`. The helper reads the user
details and access token. Express verifies token signatures and expiry on
protected API requests.

## Browser data fetching

The existing layout provider wraps the app in `QueryClientProvider`, using
TanStack Query's default settings and a stable QueryClient.

Use `useQuery` for reads and `useMutation` for writes in Client Components, with
native `fetch` inside their functions. Auth.js server requests still use native
fetch directly. Backend tokens remain server-only.

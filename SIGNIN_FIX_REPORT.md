# Sign-in fixes report

Date: 2026-10-29

## Fixed

| Problem | Change |
| --- | --- |
| Auth.js could display its internal `credentials` code instead of a useful error. | The form and callback page now use the same error mapper. The framework fallback reads `The email or password is incorrect.` Original backend messages still display unchanged. |
| A slow backend could keep sign-in waiting without a request deadline. | Added a 10-second backend request timeout, shared by email, Google, and GitHub exchanges. |
| HTML, empty, null, or malformed backend responses could expose JSON/property errors. | Validate responses and show a readable service-unavailable message for transport and invalid-response failures. |
| Malformed or already-expired tokens could expose parser errors or produce an unusable login. | Validate token expiry before accepting the backend user; reject invalid responses with the readable fallback. |
| Long and multiline errors could lose formatting or overflow the form. | Preserve line breaks and wrap long words. Messages continue to render as escaped React text. |
| The example Google environment names were incompatible with the configured Auth.js provider. GitHub settings were missing. | Documented `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET` in `.env.example`. Actual OAuth credentials must still be supplied locally. |

Backend authentication requests also reject redirects rather than forwarding credentials to a redirected endpoint.

## Verification

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed. The first restricted-network attempt failed downloading the existing Google Fonts; the network-enabled retry passed.
- `node --test scripts/signin.test.mjs`: passed, two test groups. They exercise the actual TypeScript helpers with mocked HTTP responses: invalid form inputs, framework fallback, preserved backend errors, null/missing/wrong-shaped responses, HTML responses, network failure, malformed tokens, expired access/refresh tokens, and a valid response. They also check the request payload, redirect policy, and timeout signal. The elapsed 10-second timeout was not separately timed.

Browser checks against the edited worktree at `http://localhost:3002`:

- Confirmed the old `credentials` callback error is now readable.
- Empty submission marks email and password invalid; malformed email shows its validation message.
- Password visibility control works.
- Submitted a nonexistent test email to the configured live backend: its exact `email not exist` message appeared, the entered values remained, and the form unlocked for retry.
- Simulated a Google callback error through query parameters: multiline text was preserved, HTML-like content stayed text, and a long error caused no horizontal overflow at a 375px viewport. This checks rendering, not a real OAuth exchange.

The app already running on port 3001 was used only for baseline reproduction. Post-change checks used this worktree on port 3002.

## Remaining verification limits

- No supplied confirmed account was available, so successful email login, authenticated redirects, and wrong-password rejection for an existing account were not verified live.
- Real Google/GitHub login, cancellation, consent, and callback handling require an interactive provider login and correctly registered OAuth settings. Their shared backend exchange helper was tested with mocked responses.
- This is a focused sign-in review and repair, not proof that every possible authentication or backend failure is eliminated. No backend source files were changed.

To rerun regression checks: `node --test scripts/signin.test.mjs`.

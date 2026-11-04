# Resend OTP verification

2026-11-04. Local changes only; not deployed.

Resend now displays only nonblank backend `error` text, preserving its wording and status. Without a usable backend error, the proxy returns an empty JSON object with a failure status. The page shows no error banner and releases its request lock. Inline email validation, origin checks, success handling, and cooldowns remain active. Email confirmation submission was not changed.

## Passed

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `node --test scripts/resend-otp.test.mjs`: focused regression test covering request shape, original error text/status, cooldown metadata, malformed responses, connection/timeout exceptions, validation, and origin rejection.
- Browser checks against the built app at localhost:3018 with a separate HTTP backend fixture on localhost:4018:
  - Opening verification sends no automatic resend request.
  - Original backend error appears unchanged.
  - Backend cooldown displays its error and starts a 30-second countdown.
  - Disconnected backend, real 10-second timeout, HTML response, empty error response, and unexpected success response show no error banner; Resend becomes available again.
  - Simulated browser fetch rejection also shows no banner and releases the button.
  - Invalid email retains inline validation and sends no request.
  - Successful resend clears the OTP, shows success, starts a two-minute countdown, and saves its deadline.

## Tooling limitation and remaining risk

Postman CLI was absent. Its installation failed with EACCES while accessing the npm registry; Postman simulation/status could not run. Verification used the existing Node/TypeScript test pattern and a temporary local HTTP fixture. These checks establish frontend behavior, not production backend behavior or email delivery.

No real email was sent. Production was not deployed or retested with these changes. As requested, a failed connection now gives the user no error explanation.

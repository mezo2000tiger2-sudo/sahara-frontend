# Profile image verification — 2026-11-01

## Static and focused checks

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed after allowing network access for the existing Google
  Fonts downloads. The first restricted run failed fetching DM Sans and Outfit;
  no font or application changes were needed.
- `git diff --check`: passed.
- `node scripts/check-profile-images.mjs`: passed. Executes production schemas,
  route, server helper, and browser helper with transport/cookie fixtures. Covers
  PNG/JPEG, empty/unsupported files, unknown fields, text, duplicate files, both
  image fields, malformed multipart, origin/authentication before parsing, no
  backend fetch on invalid requests, FormData forwarding/boundary, unchanged JSON
  updates, backend status/text, renewal replay, normalization/idempotence, and
  private-data projection. This is fixture evidence, not live backend evidence.
- Independent security source review found no blocking findings.
- Backend source already has singular `coverImage` for saving/replacement cleanup,
  with one-file multipart limits. Its pre-existing modified files were preserved.

## Browser against loopback fixtures

Real Next.js app, real route handlers, generated encrypted local Auth.js session,
and in-memory HTTP backend via `scripts/profile-review-server.mjs`:

- Avatar-only and cover-only saving succeeded. Cover saving retained the avatar;
  subsequent avatar replacement retained the cover and personal details.
- The same filename was selected repeatedly and saved; input values reset.
- Unsupported and empty selections showed their validation messages.
- Backend rejection displayed `Fixture upload rejected` and retained images.
- `jwt expired` renewed the session and replayed the multipart upload successfully.
- Successful upload followed by profile GET 503 retained the previous images and
  details, said that saving succeeded, and offered Retry refresh. Retrying after
  recovery displayed the new image and cleared the warning.
- Reload/navigation to the shared profile displayed both saved fixture images.
  The signed-in owner saw zero file inputs on the shared route.
- Missing images used initials/gradient. Broken images also used these fallbacks.
- At 320px: banner 144px high and no horizontal overflow. At 1440px: banner 192px
  high, no horizontal overflow, avatar plus 36px wide with bottom/left placement.
- Light and dark themes rendered; keyboard traversal reached the cover control
  with a visible computed focus ring. Status and error roles are present.

Uploads in these checks used browser-created File objects dispatched through the
actual file-input change handlers. Native picker automation did not expose an
open chooser, so native picker cancellation and keyboard activation through the OS
dialog remain unverified. Source checks confirm cancel returns without mutation.

## Remaining verification and limits

No real user account/session was supplied for live mutation tests. Real storage
uploads, database/reload persistence, Cloudinary replacement deletion, actual
expired backend credentials, interrupted real uploads, large uploads, and exhaustive
screen-reader/device coverage remain unverified. The transport interruption path
is covered by the focused helper fixture, rather than a real network interruption.

Existing hosting limits and the server's 10-second upstream timeout still apply.
A timeout can occur after the backend accepted a save; refresh before retrying if
the outcome is uncertain. Deploy the backend's existing singular-field correction
alongside the frontend. No dependencies, commits, or unrelated refactors were added.

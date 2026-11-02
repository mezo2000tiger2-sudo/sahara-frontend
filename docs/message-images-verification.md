# Inline message images verification

2026-11-02. Frontend implementation only; backend, uploads, authentication, pagination and error handling were retained.

## Automated checks

Passed: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `node scripts/check-messages.mjs`, `node scripts/conversation-check.mjs`, `node scripts/check-session-refresh.mjs`, `node --test scripts/signin.test.mjs`, and `git diff --check`.

The updated existing checks execute actual route/client/schema source with synthetic transport and cookie access. They cover Cloudinary object responses through routes, zero/one/three attachment slots, legacy HTTPS strings, invalid URLs, credential-bearing URLs, local paths, attachment-only messages, counts, metadata removal, and anonymous sender stripping. Existing validation, authentication, original errors, refresh/retry, cancellation and terminal-session checks still pass. Conversation sender IDs remain available for the existing identified chat UI.

## Browser fixtures

Used the real local Next app with `message-review-server.mjs` and `conversation-review-server.mjs`, synthetic encrypted sessions and local HTTP backend fixtures.

Conversation image display was temporarily removed at the user's request, then enabled together with multipart uploads after backend support was added. See conversation-verification.md for the latest upload checks.

- Received cards: zero/one/three attachments and text-only/attachment-only records loaded; scrolling paginated to all 12 received fixture messages. A Load more click timed out after scrolling triggered automatic pagination; all records subsequently loaded.
- Sent cards: image thumbnails rendered at desktop and 320px; no horizontal document overflow.
- Details: a valid image and two independent unavailable slots rendered at 320px in dark mode; attachment-only details rendered at 320px and desktop with `object-fit: contain`. The valid image stayed visible when another failed. Refresh was exercised on attachment-only details and Sent lists.
- Received layout was also checked at 320px. Light/dark theme controls worked. Resize initially reported an old viewport; later page evaluation confirmed `innerWidth === 320`.
- Native images used lazy loading and `no-referrer`. Local paths and Cloudinary metadata were absent from sanitized response checks.

## Cloudinary delivery evidence

Public Cloudinary demo `sample.jpg` returned HTTP 200 in the browser and rendered. A deliberately nonexistent demo asset returned HTTP 404 and displayed “Image unavailable.” This is real public delivery evidence using fixture URLs, not upload-to-recipient verification on this application's cloud account.

## Errors and limits

Development logs reported failed Google Fonts downloads for DM Sans and Outfit and used fallback fonts. Production build passed. No font code was changed; typography with downloaded fonts was not established by these dev checks.

Some preview automation clicks using `main button` were rejected as invalid selectors. Refresh was subsequently invoked through the real DOM button. These are tool failures, not application errors. The deliberate image 404 is expected fixture behavior.

No live test-account credentials were supplied. No real upload, recipient account, database records, live session renewal or anonymous Sent exclusion was tested end to end. Source review supports anonymous sender exclusion and response schemas test identity stripping; these are weaker than two-account live proof. Backend findings and remaining public-delivery risks are in [the separate report](message-images-backend-findings.md).

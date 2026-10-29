# Messages and identity requests

`/message` has Messages / Identity requests views and Received / Sent tabs. Selection lives in the URL as `view=messages|requests` and `direction=received|sent`; received messages are the default. `/message/[messageId]` opens one message directly.

The feature uses the existing QueryClient provider. Lists use TanStack `useInfiniteQuery` with five items per page and `react-intersection-observer` for the bottom marker. A Load more button also supports keyboard access. Queries are scoped to the profile user ID, have a 60-second stale time, and do not automatically retry. Refresh is explicit. Loaded records are deduplicated by ID because numbered pagination can shift while records change.

## Contracts

The [Saharah Postman collection](https://go.postman.co/collection/51167906-96fc6bac-264f-40b0-8b6b-ad9b868b0bdf) defines requests without saved response examples. Envelopes were checked against the local Express handlers.

| Next route | Express route | Result |
| --- | --- | --- |
| `GET /api/messages?direction=received&page=1&size=5` | `GET /message/get-messages?page=1&size=5` | `{ message, data: { messages, page, pages, size } }` |
| `GET /api/messages?direction=sent&page=1&size=5` | `GET /message/get-sent-messages?page=1&size=5` | Same envelope |
| `GET /api/messages/:messageId` | `GET /message/get-message-by-id/:id` | `{ message: Message }` |
| `GET /api/identity-requests?direction=received&page=1&size=5` | `GET /identity-request?direction=received&page=1&size=5` | `{ message, requests, page, pages, size }` |
| `POST /api/identity-requests` | `POST /identity-request` with `{ messageId }` | 201 new / 200 existing `{ message, request, conversationId }` |
| `PATCH /api/identity-requests/:requestId` | `PATCH /identity-request/:requestId` with `{ status: "accepted" | "rejected" }` | `{ message, request, conversationId }` |

`POST /api/messages` keeps the existing multipart send-message behavior. Identity-request directions have different meaning from message directions: **received requests** ask you to reveal your identity; **sent requests** are requests you made to another sender.

## Privacy and errors

The browser calls same-origin Next routes. `messages-api.server.ts` reads backend tokens through `decryptToken(true)`, uses a ten-second timeout, validates inputs and successful responses, and returns private non-cached JSON. POST/PATCH check the application origin. Backend failures retain their status, message and readable validation details.

Message schemas strip unlisted fields, including sender IDs, and replace attachment paths with `attachmentCount`. Requester profiles allow only ID and names. Tokens and local filesystem paths are not returned to the browser. Attachments display an unavailable notice until the backend supplies a protected serving route.

The browser reuses session renewal, retrying the original request once for `jwt expired`. Terminal 401 clears private query data and signs out. Identity mutations do not retry transport failures automatically.

The recipient can explicitly request sender identity from details. The backend returns an existing request if one already exists, including a rejected one. Details do not scan every request page to reconstruct status after reload; request management lives in the list view. Accepting creates a conversation and removes the original message from the received/sent message lists, while its detail remains accessible. This feature confirms acceptance but does not implement chat pages or replies.

## Verification

Run `node scripts/check-messages.mjs` for route/schema boundary checks. The script executes real route/helper/schema source with transport and cookie access replaced; it does not establish live backend correctness.

For an isolated browser review, run `node scripts/message-review-server.mjs` after build checks finish. It runs the real Next app at `http://127.0.0.1:3011` and an HTTP backend stand-in at port 4011, binding both to loopback. It uses a process-only random Auth.js secret and synthetic encrypted session; `.env` and production auth code are unchanged.

Open `http://127.0.0.1:4011/__review/login` to set the synthetic session and enter the app. Set fixture scenarios with `/__review/scenario?name=normal|empty|list-error|next-error|malformed|expired-once|unauthorized|transport|decision-error` on port 4011, then refresh the app. `/__review/state` reports calls and synthetic request state without tokens. Resetting a scenario resets all fixture data. Stop with Ctrl+C. No real messages or identity decisions are sent.

Fixture behavior is derived from checked-out backend handlers, not from a published mock. It does not reproduce MongoDB transactions, Redis revocation, deployment proxies, or actual user sessions. Lint, typecheck, build and independent browser-review outcomes are recorded in `docs/message-implementation-report.md`.

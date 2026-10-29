# Message browser review

Reviewed 2026-10-29 using the real running Next.js app at `http://127.0.0.1:3011`, T3 preview browser tools, and `scripts/message-review-server.mjs` on loopback port 4011. Authentication used a synthetic encrypted Auth.js cookie. All requests and decisions used synthetic fixtures; no real backend sends or decisions were made.

## Result

The tested message and identity-request flows pass. One mobile header overflow defect was found, fixed by the implementation owner, and rechecked successfully. No remaining confirmed defects from this browser review.

## Browser coverage

| Case | Result | Evidence |
| --- | --- | --- |
| Initial received list | Pass | Five cards; fixture log contains received messages page 1 and no hidden sent/request-list fetch after scenario reset. |
| Infinite scrolling | Pass | Card count 5 → 10 → 12; 12 unique detail links; final “You’re all caught up.” state. Fixture logged pages 1, 2, 3 exactly once. |
| Selected Messages / Identity requests and Received / Sent views | Pass | All four views rendered corresponding data and explanatory text. Request direction describes who requests whose identity correctly. |
| Page failure and retry | Pass | `next-error` returned 503. Five loaded cards remained, role=alert contained verbatim “Fixture messages unavailable”, and “Retry loading more” appeared. Retry during failure retained five; after fixture recovery retry produced ten unique cards. |
| Direct content detail | Pass | Message content and timestamp displayed. |
| Long text | Pass | Detail contained complete long fixture content; list preview was visually clamped. |
| Attachment-only detail | Pass | “This message contains attachments.”, count, and unavailable-preview explanation. No raw private attachment URL exposed in rendered UI. Actual preview delivery is outside this fixture. |
| Invalid ID | Pass | `/message/not-valid` displayed local “Invalid message ID” / invalid-link explanation. |
| Missing valid ID | Pass | Valid absent ID displayed backend wording “message not found”. |
| Explicit identity request | Pass | Opening recipient detail did not POST. Only clicking “Request sender identity” sent a request. Sent-message detail had no recipient action. |
| Anonymous sender | Pass | Explicit request for message 1 produced 409 and verbatim “sender is not logged in”; no success state. |
| New and existing request | Pass | Attachment-only message 2 created a new request (201); long message 3 returned existing request (200). Both displayed pending status and removed the submit action. |
| Accept request | Pass | Request 101 became Accepted, action buttons disappeared, and conversation-created / unavailable-chat status appeared. Fixture recorded one PATCH. |
| Reject request | Pass | Request 102 became Rejected, action buttons disappeared, and final rejection explanation appeared. |
| Accepted message isolation | Pass | Accepted message 13 disappeared from sent messages; direct `/message/00000000000000000000000d` still rendered its content. |
| Malformed response | Pass | Browser API response 502; readable “Invalid response from the message service.” and “Try again”. |
| Transport failure | Pass | Browser API response 503; readable “Unable to reach the message service.” and “Try again”. |
| Expired JWT once | Pass | Five cards ultimately rendered. Fixture recorded message GET, one POST `/user/refresh-token`, then retried message GET. |
| Terminal unauthorized | Pass | 401 triggered POST `/api/auth/signout`, redirect to `/signin?error=SessionExpired`, and “Your session expired. Please sign in again.” |
| Narrow screen after fix | Pass | At CSS width 390, document width 375; at width 320, document width 305 and header navigation right edge 281. No horizontal document overflow. |
| Basic keyboard | Pass, limited | Tab reached “Skip to content”; Enter activated `#main-content`. Controls have semantic links/buttons in the accessibility tree. Full keyboard traversal and screen-reader testing were not performed. |

## Found and fixed

The authenticated header overflowed at width 390: document scrollWidth was 472 and navigation extended to x=472.375; the theme controls extended offscreen. The implementation owner added wrapping and a full-width narrow-screen navigation row. Rechecks at 390 and 320 passed as above.

Screenshots under `docs/message-review/` show the original overflow and the final narrow-screen state.

## Diagnostics and limits

- Browser diagnostics showed expected HTTP failures for injected 409, 404, 502, 503, 500-expiry, and 401 scenarios. Development HMR logs and aborted initial fetches occurred. No uncaught runtime exception was observed in inspected snapshots.
- Development remounts sometimes issued two initial page-1 requests when switching views; there was no observed unbounded request loop. Scrolling pages 2/3 were each requested once in the isolated normal run.
- Zero-latency fixtures prevented reliable observation of buttons during in-flight decisions or rapid double-submit behavior. Final-state action removal and one PATCH per deliberate click were verified; pending-disable timing remains unverified in the browser.
- Empty state, decision-error recovery, and accepted/rejected POST-return states were not separately exercised in this browser pass. Other verification may cover these; this report does not claim browser coverage for them.
- This establishes frontend behavior against a controlled HTTP fixture. It does not establish live backend authorization, transactions, concurrency, attachment delivery, or production session behavior.
- One stale-reference click was rejected by automatic approval review; a fresh snapshot and explicit known target succeeded. Early `getByRole(...)` locator strings were unsupported by this preview tool; current accessibility references / observed href selectors were used successfully. No browser fallback was needed.

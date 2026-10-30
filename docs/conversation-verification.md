# Conversation verification

Implemented `/conversation`, `/conversation/[conversationId]`, the authenticated proxy routes, TanStack Query list/history/send functions, navbar entry, and links from accepted identity requests.

## Passed

- `npm run lint`, `npm run typecheck`, and `npm run build`.
- `node scripts/conversation-check.mjs`: request validation, pagination bounds, authentication/origin checks, attachment-path privacy, original backend errors, response validation, transport failures, signal forwarding, refresh/retry with preserved request body, and terminal-401 cache/session cleanup.
- Browser against the real local Next.js app with an isolated HTTP fixture backend: sample login, navbar/list/chat navigation, chronological latest messages, sender labels and blue own-message bubbles, older-history loading, failed send retaining the draft and backend error text, and successful retry clearing the draft and showing the new message.
- Desktop and 390 x 844 mobile screenshots inspected for layout and readability.
- Next.js runtime tools reported no compilation issues and confirmed the conversation routes.

## Runtime observation

The runtime error list also contained a separate sign-in URL with a hydration attribute mismatch involving `cz-shortcut-listen=true`, an attribute associated with a browser extension. It was not listed against the conversation session. No sign-in or extension code was changed.

## Limits

These browser checks used synthetic session data and a local mock backend, never real messages or accounts. Live backend behavior, two real accounts, identity acceptance end to end, incoming-message polling timing, and every empty/error state were not browser-verified. The route/client checks mock their dependencies and do not prove live authentication.

The backend uses offset pagination. Automatic history refresh pauses while reading older messages and resumes near the bottom; cursor pagination would be needed to keep that history stable during continuous updates. Replies are text-only and the conversation list remains ordered by creation date.

## Review locally

The review server uses `http://127.0.0.1:3011/conversation`. Open `http://127.0.0.1:4011/__review/login` first for the sample account. It was stopped after screenshots, as requested. To restart later, run `node scripts/conversation-review-server.mjs`.

Screenshots: [desktop](conversation-desktop.png), [mobile](conversation-mobile.png).

## Full-screen detail layout update

The detail route now uses its own `(conversation)` layout, keeping the same URL. It fills the viewport instead of inheriting the messages page's width limit. History scrolls independently, the composer stays at the bottom, and the site footer is hidden only on this screen.

Browser layout assertions passed at 1440 x 900 and 390 x 844: the main area matches the viewport, the document has no outer vertical scrollbar, and the composer stays visible. The conversation list keeps its normal layout and footer. These checks used the isolated fixture backend.

Updated screenshots: [full-screen desktop](conversation-fullscreen-desktop.png), [full-screen mobile](conversation-fullscreen-mobile.png).

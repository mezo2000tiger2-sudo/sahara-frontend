# Essential new endpoints: coding-agent implementation contract

Status: design specification, not implemented routes. Current backend inspected on 28 October 2026. Implement this contract together with [models.md](./models.md). Do not change the model design to add `originalMessageId` or a separate `ConversationMessage` model.

This file specifies **six core new Express endpoints**. Section 11 also specifies one required supporting download route for preserving existing image attachments: uploads exist, but no file-serving route was found in the inspected backend. Existing anonymous message sending and reading routes are prerequisites, not new endpoints. The Markdown specs use the current backend naming and are the implementation reference where older diagrams differ.

## 1. Current backend and implementation boundaries

- Backend: sibling `saharah_backend`; Express bootstrap is `src/app.bootstrap.js`.
- Existing router mounted at `/message`: `src/DB/modules/messages/messages.controller.js`.
- Existing routes: `POST /message/create-message`, `GET /message/get-messages`, `GET /message/get-sent-messages`, `GET /message/get-message-by-id/:id`.
- Existing Message fields: `recevierId` (receiver, preserve spelling), optional `senderId`, `content`, `attachments`, timestamps/version key.
- `conversationId`, IdentityRequest, and Conversation are proposed additions, not currently implemented in the inspected source.
- Preserve guest anonymous sending. A message with no known sender cannot receive an identity request. Do not assign the receiver as its sender.
- Add identity-request and conversation modules using the existing controller/service/validation pattern, mount `/identity-request` and `/conversation`, and add the request-creation route to `/message`.
- Use existing authentication, Joi, Mongoose, and `success_response`; no new dependency or public conversation-creation route is required.

## 2. Shared validation and authorization

Apply these rules to all six new endpoints:

1. Authenticate before executing feature logic. Require a confirmed account. Missing/invalid/expired/revoked authentication returns 401; an authenticated unconfirmed account returns 403. Normalize middleware errors to these statuses for the new routes if current shared behavior differs.
2. Path IDs must be 24-character hexadecimal ObjectId strings. Invalid syntax returns 400; syntactically valid missing or inaccessible objects return the same 404 response.
3. Validate only the listed body/query fields. Reject unknown body/query properties, including client `senderId`, `recevierId`, `participants`, `conversationId`, and `status` where not explicitly allowed. Prevent mass assignment; never pass the full body into a model write.
4. Compare ObjectIds by value. String/ObjectId object identity comparisons are not membership checks.
5. Only the sender and receiver involved in the referenced message may view their request. Only its receiver may create that request, and only its sender may decide it.
6. For every conversation read/write, load Conversation with both `_id: conversationId` and `participants: currentUserId`. A failed membership lookup returns 404. Perform this lookup before querying history or saving a Message. There is no administrator bypass.
7. Participants are exactly the two distinct users from the accepted message. There is no endpoint to add, replace, or remove participants.
8. Never populate/return an entire User document. Use the DTO allowlists below. Anonymous responses must omit sender identity even when a service privately selected it.

### Pagination for all three GET endpoints

- `page`: positive safe integer, default `1`.
- `size`: integer `1..50`, default `5`, matching the current backend default.
- Convert scalar numeric query strings to numbers with validation. Reject fractions, nonnumeric values, repeated/array values, or an unsafe `(page - 1) * size` with 400.
- Apply ownership/membership filters **before** counting or paginating.
- Sort by `createdAt: -1, _id: -1`.
- `pages = Math.ceil(totalMatchingDocuments / size)`. An empty result has `pages: 0`; a page beyond the end returns an empty array and the real page count.
- Chat pages are newest first; the UI can reverse them for chronological display. Do not invent a separate original-message response or prepend a duplicate message.

## 3. Exact response shapes

Use the current helper's root-level envelope: `success_response({ res, statusCode, data: { ...responseFields } })` produces `{ "message": "done", ...responseFields }`. Do not add another `data` wrapper for these new endpoints, and do not use a response field named `message` for a document because it would overwrite the success string.

All ObjectIds below serialize as strings; all dates serialize as ISO 8601 strings. Optional profile avatar and optional message content are serialized as `null` when absent, rather than omitted.

### SafeProfile

```ts
{
  _id: string;
  fName: string;
  lName: string;
  avatar: string | null;
}
```

No email, phone, password, role, tokens, or credential timestamps are included.

### RequestRecord

```ts
{
  _id: string;
  messageId: string;
  status: "pending" | "accepted" | "rejected";
  requester: SafeProfile; // Message.recevierId, not its sender
  createdAt: string;
  updatedAt: string;
}
```

The requester profile is safe for either request party to see. Do not include the message sender or a populated Message document in this DTO. The sender can retrieve message content through the existing authorized message-detail route while it is standalone.

`conversationId` is returned alongside RequestRecord in mutation responses, and inside each request item in the list response. It is `null` unless status is accepted. Resolve accepted values through the referenced Message; do not store a duplicate conversation ID on IdentityRequest.

When returning an accepted request from any endpoint, verify its Message has a valid conversation link with the expected participants. Broken accepted state returns controlled 409 `"conversation is unavailable"`; do not invent a replacement or return an accepted result with a null conversation ID.

### ConversationSummary / ConversationContext

```ts
{
  _id: string;
  participants: [SafeProfile, SafeProfile];
  createdAt: string;
  updatedAt: string;
}
```

These profile identities are revealed only after accepted consent has created the conversation and the current caller passed membership authorization.

### ChatMessage

```ts
{
  _id: string;
  conversationId: string;
  senderId: string;
  recevierId: string;
  content: string | null;
  attachments: string[];
  createdAt: string;
}
```

`attachments` contains backend-relative authorized download URLs, **not** raw disk paths or original filenames: `/message/{messageId}/attachments/{index}`. A text-only chat POST returns `[]`; an anonymous message that already had images can retain them when it enters chat. Use the supporting route specified in section 11. Do not create public file access as an implementation shortcut.

## 4. Endpoint 1: create an identity request

**`POST /message/:messageId/identity-request`**

Input: valid `messageId`; no body or an empty JSON object. Reject any body properties or a non-object JSON body. No query parameters.

Authorized caller: the referenced Message's receiver (`recevierId === currentUserId`).

Service algorithm:

1. Load the message by `_id` and `recevierId: currentUserId`. Select senderId privately. Missing/inaccessible message returns 404.
2. Look for the unique IdentityRequest for `messageId` **before** rejecting a message already linked to a conversation. If one exists, return its current result with 200; do not reset status or create another request. This also handles retrying creation after acceptance.
3. For a new request, require `conversationId` to be null/missing, a known existing sender, and distinct sender/receiver. A chat message cannot create a new request. Unknown/guest/legacy sender returns 409.
4. Create only `{ messageId, status: "pending" }`.
5. If concurrent creation hits the unique `messageId` index, load and return the existing authorized request with 200. Do not return a raw duplicate-key error.

New request response: **201**. Existing request response: **200**. Both use this exact envelope:

```json
{
  "message": "done",
  "request": {
    "_id": "300000000000000000000001",
    "messageId": "200000000000000000000001",
    "status": "pending",
    "requester": {
      "_id": "100000000000000000000002",
      "fName": "Demo",
      "lName": "Receiver",
      "avatar": null
    },
    "createdAt": "2026-10-28T09:00:00.000Z",
    "updatedAt": "2026-10-28T09:00:00.000Z"
  },
  "conversationId": null
}
```

All sample IDs/names/dates in this document are synthetic. An existing accepted request returns its accepted status and its conversation ID instead of null.

Errors specific to this operation: 404 message inaccessible/missing; 409 sender unknown/unavailable, users not distinct, or message already in a conversation without an existing request.

## 5. Endpoint 2: list identity requests

**`GET /identity-request?direction=received&page=1&size=5`**

Input: `direction` is `"received" | "sent"`, default `"received"`; shared `page`/`size`. No body.

Ownership is derived through each request's Message:

- `received`: `Message.senderId === currentUserId`; these are identity requests asking this user to reveal themselves.
- `sent`: `Message.recevierId === currentUserId`; these are requests made by this user.

Resolve ownership before count/limit/skip. Use a join/aggregation or an equivalent authorized query. Do not paginate Messages first and then remove ones without requests; that produces incorrect request pages.

Response: **200**.

```ts
{
  message: "done";
  requests: Array<RequestRecord & { conversationId: string | null }>;
  page: number;
  pages: number;
  size: number;
}
```

Each item is a RequestRecord with its accepted conversation ID or null. Pending/rejected items must not contain sender identity. The receiver learns status by refreshing this list; no separate request-detail endpoint is required.

An empty authorized list is 200 with `requests: []`, not 404. Do not accept a caller-supplied owner/user ID filter.

## 6. Endpoint 3: accept or reject a request

**`PATCH /identity-request/:requestId`**

Input: valid request ID; JSON body containing exactly one property:

```json
{ "status": "accepted" }
```

or:

```json
{ "status": "rejected" }
```

Authorized caller: only the sender of the request's referenced Message. The requester/receiver and every third user receive 404. No query parameters.

### Decision algorithm and concurrency

1. In a Mongoose transaction, load IdentityRequest and its Message using the transaction session. Privately select senderId and verify it equals the authenticated caller before returning status or profiles.
2. If status already equals the requested decision, return its existing result without changing timestamps or creating another conversation. For accepted, resolve the existing conversation through `Message.conversationId` and verify it has the expected two participants. Return only after the transaction has completed.
3. If status is the opposite terminal decision, return 409. Decisions cannot be changed or reset.
4. For a pending request, conditionally update by `{ _id: requestId, status: "pending" }`. All decision paths, including rejection, must use this pending-state condition. A lost race must reload the committed result and follow steps 2–3; it must not overwrite a final decision.
5. Rejection changes only request status to rejected; do not create a conversation or expose sender identity.
6. Acceptance additionally requires a known sender, an existing receiver, distinct sender/receiver, and a Message not yet in a conversation. Create Conversation with exactly `[message.senderId, message.recevierId]` derived server-side.
7. Conditionally assign the selected Message's `conversationId` where `_id` matches and `conversationId: null` matches null/missing. Require exactly one matched message. Any failure aborts the transaction, including the pending-state claim and Conversation insert.
8. Use the same session for **every database read/write in the transaction**. Execute sequentially, not with `Promise.all`. Use the transaction helper's retry handling for transient conflicts, then apply the same-decision/opposite-decision rules against the final state.
9. Commit before returning identity-related results or `conversationId`. The selected Message is now a normal chat message; it must not be copied, flagged, or returned as a separate original-message object.

The three acceptance writes are the request transition, Conversation creation, and Message assignment. There is no unique original-message field on Conversation. Duplicate acceptance is prevented by the unique request-per-message index, the conditional request transition, and the transaction. A failed or retried transaction must leave no orphan Conversation.

Response: **200**.

```ts
{
  message: "done";
  request: RequestRecord;
  conversationId: string | null; // ID for accepted; null for rejected
}
```

If a previously accepted request has a missing/broken conversation link, return controlled 409 `"conversation is unavailable"`. Do not silently create a replacement conversation or reveal a different person's profile.

## 7. Endpoint 4: list the current user's conversations

**`GET /conversation?page=1&size=5`**

Input: shared `page`/`size`. No body and no caller-supplied participant/owner filters.

Filter: `{ participants: currentUserId }`. Count and paginate only this user's conversations. Populate only `_id fName lName avatar`, then serialize with SafeProfile.

Response: **200**.

```ts
{
  message: "done";
  conversations: ConversationSummary[];
  page: number;
  pages: number;
  size: number;
}
```

An empty list is 200 with `conversations: []`. Do not grant an administrator visibility into conversations where they are not a participant. This endpoint lets both parties find and reopen their accepted chats.

## 8. Endpoint 5: get conversation messages and context

**`GET /conversation/:conversationId/messages?page=1&size=5`**

Input: valid conversation ID and shared `page`/`size`. No body.

Service algorithm:

1. Load Conversation by `_id` **and** `participants: currentUserId`; missing/nonmember returns 404.
2. After membership succeeds, query Message by `{ conversationId }` and explicitly include `senderId` in this authorized query if the model has `select: false`. Do not filter only by receiver: each participant must see both sent and received chat messages.
3. Count, sort, and paginate this same message filter. Serialize all messages with ChatMessage and the conversation with ConversationContext.
4. Include the selected Message naturally in this query. Do not prepend it, fetch it through a special field, or create a second copy.

Response: **200**.

```ts
{
  message: "done";
  conversation: ConversationContext;
  messages: ChatMessage[];
  page: number;
  pages: number;
  size: number;
}
```

This response supplies both the header/profile context and history. Therefore no additional `GET /conversation/:id` endpoint is essential. Knowing the URL or ID does not authorize access.

## 9. Endpoint 6: send a conversation message

**`POST /conversation/:conversationId/messages`**

Input: valid conversation ID; JSON containing exactly one property:

```json
{ "content": "My reply" }
```

Trim `content` and require 1–5000 characters after trimming. This new endpoint is text only. Reject attachments, arbitrary receiver/sender IDs, participant lists, and a body conversation ID. No query parameters.

Service algorithm:

1. Perform the shared membership lookup before saving anything.
2. Derive `senderId = currentUserId` and `recevierId = the other stored participant`.
3. Create a document in the existing **Message** model with the validated content, derived IDs, path `conversationId`, and `attachments: []`.
4. Serialize a ChatMessage; do not return the raw created document/array. The current `dbService.create` returns an array, so unwrap deliberately if it is reused.

Response: **201**.

```json
{
  "message": "done",
  "chatMessage": {
    "_id": "200000000000000000000002",
    "conversationId": "400000000000000000000001",
    "senderId": "100000000000000000000002",
    "recevierId": "100000000000000000000001",
    "content": "My reply",
    "attachments": [],
    "createdAt": "2026-10-28T09:10:00.000Z"
  }
}
```

Every successful POST creates a message. No client-message-id/idempotency field is introduced. The client must not automatically retry after an unknown network outcome, because that can duplicate a message.

## 10. Controlled error contract

For these new routes use `{ "message": "error", "error": "..." }`, with optional existing validation `details`. Do not expose stack traces, raw duplicate-key text, populated private documents, or private sender IDs.

| Status | Conditions | Error text |
| --- | --- | --- |
| 400 | Invalid path ID | `invalid message id`, `invalid request id`, or `invalid conversation id`, matching the parameter. |
| 400 | Invalid/unknown body or query field, pagination, decision, or content | `invalid input` with safe validation details if available. |
| 401 | Missing credentials | `authentication required` |
| 401 | Invalid, expired, or revoked credentials | `invalid authentication` |
| 403 | Authenticated account is unconfirmed | `account not confirmed` |
| 404 | Missing/inaccessible selected Message | `message not found` |
| 404 | Missing/inaccessible request or unauthorized decider | `request not found` |
| 404 | Missing/inaccessible Conversation | `conversation not found` |
| 409 | New request cannot identify a sender, including guest/legacy sender | `sender identity is unavailable` |
| 409 | Cannot create new request or accept because Message already belongs to a conversation | `message already belongs to a conversation` |
| 409 | Opposite terminal decision requested | `request already decided` |
| 409 | Accepted state has a missing/mismatched Conversation | `conversation is unavailable` |
| 409 | Known sender and receiver are the same, or a required participant is missing at acceptance | `conversation participants are invalid` |
| 500 | Unexpected database/server failure | `internal server error`; log details server-side without leaking credentials or private response data. |

Request creation returns an existing request before checking the already-in-conversation conflict. Same-decision retries are successful responses, not 409. Existing unrelated endpoint error wording is outside this new-route contract.

## 11. Supporting endpoint: download an existing message attachment

**`GET /message/:messageId/attachments/:index`**

This supporting route is required if the implementation preserves usable existing image attachments, as this contract requires. It is separate from the six core request/chat operations and does not add chat uploads or another model. The inspected backend has upload storage but no `express.static`, `sendFile`, or download route for these files.

- Require Bearer authentication and a confirmed account. Validate `messageId` as an ObjectId string and `index` as an integer path value `0..2`. No body or query parameters.
- Load the Message by ID. If it belongs to a Conversation, perform the same two-participant membership check used by chat history. Otherwise require the caller to equal `recevierId` or the known `senderId`; a guest-authored standalone message can therefore be downloaded only by its authenticated receiver.
- Resolve the selected file from `Message.attachments[index]`. Missing/inaccessible message, absent attachment index, missing file, or failed membership returns 404 `"attachment not found"`; invalid ID/index syntax returns 400 `"invalid input"`.
- Never accept a path or filename from the caller. Resolve the stored path relative to the backend storage root and verify that its absolute path stays inside the allowed `uploads/messageAttachments` directory. A path outside that directory must not be served.
- Return **200 with the binary file**, not a JSON success envelope. Use a generated download filename such as `attachment-0`, not the upload's original name. Send `Content-Type: application/octet-stream`, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-store`.
- Keep storage files private; do not mount the upload directory publicly. Once headers/file streaming have started, do not try to send a second JSON response on a transport failure.
- A frontend must fetch this route through its authenticated server/proxy integration. Do not expose backend Bearer tokens in image URLs, browser storage, or public sessions.

These rules provide an authenticated download for existing images. Inline previews and new chat-image uploads are not required by this contract.

## 12. Required changes to existing routes before release

These are necessary compatibility/privacy changes; they are not additional new endpoints:

- Existing standalone create continues to accept `recevierId`, derives known `senderId` from optional authentication, and must reject client `senderId`/`conversationId`. Preserve guest sending and image support. Ensure a known sender and receiver are distinct before permitting identity requests.
- Existing inbox and sent-list queries must filter `conversationId: null` so messages assigned to chat leave the standalone views. MongoDB's null filter includes legacy records with a missing conversationId. Preserve their existing envelopes and `page`/`size` behavior.
- Existing message-detail must check Conversation membership whenever its Message has a conversationId. An old detail route must not provide a bypass around new conversation authorization. Continue to hide sender identity for standalone messages.
- Existing create/list/detail responses must explicitly omit anonymous sender identity and private User/storage fields, including when a create helper returned a raw document or array.
- Attachment URLs must use authorized application serving. For conversation-bound messages, apply the same participant check; for standalone messages, authorize sender/receiver. Do not expose disk paths or make existing files publicly readable to avoid adding the guard.
- Keep all chat history in Message. Do not introduce an original-message pointer, separate original-message DTO, embedded message history, or a second chat-message collection.

Implement these prerequisites using the existing route/storage conventions. They do not authorize redesigning unrelated profile/authentication contracts or rewriting the frontend in this documentation task.

## 13. Verification checklist for the implementing agent

Use authenticated confirmed users A (sender), B (receiver), and C (stranger), plus a guest-authored message. These are future implementation checks, not test results from producing this document.

1. B requests identity of A's standalone Message: 201 pending; repeat and concurrent create return the same one request. C and A cannot create it as receiver.
2. `direction=received` shows the request to A; `direction=sent` shows it to B; C sees neither. Validate ownership before pagination and verify empty/out-of-range pages.
3. Guest/unknown sender produces 409 without guessing identity. A valid guest message can still remain in the anonymous inbox.
4. B/C cannot decide A's request, including with a known ID. A rejection reveals nothing and creates no conversation. Same rejected retry is 200; an attempted later acceptance is 409.
5. Acceptance commits accepted status, exactly two participants, and Message.conversationId together. The Message ID stays the same and appears once in normal history.
6. Repeated/concurrent accepts create one Conversation. Concurrent accept/reject yields one terminal decision; the opposing result is 409. Force each acceptance write to fail and verify complete rollback, including no orphan Conversation.
7. A/B can list/read/send; C cannot list another user's chats, read history/context, post, or access attachments. Repeat with an administrator C; no bypass is allowed.
8. Chat POST rejects spoofed sender/receiver, body conversationId, participant fields, blank/oversize content, and attachments. Verify the saved receiver is always the other participant.
9. History contains messages from both participants and uses consistent date/ID ordering. The selected message is neither separately returned nor duplicated.
10. Invalid IDs/query/body return 400; missing/invalid session 401; unconfirmed account 403; inaccessible objects 404; terminal conflicts 409. Check bodies for private field or raw database-error leakage.
11. Inspect real HTTP responses: anonymous data has no sender identity; revealed profiles contain only SafeProfile fields; no passwords, contact details, raw storage paths, or extra User properties escape.
12. Verify actual indexes and transaction-capable MongoDB before rollout. Do not report only schema parsing/typechecking as live authorization or concurrency verification.

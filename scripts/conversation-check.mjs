import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

// Run real route/client/schema code with only transport and cookie access replaced.
const dependency = createRequire(import.meta.url);
const origin = "http://127.0.0.1:3011";
const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const otherId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const conversationId = "cccccccccccccccccccccccc";
const timestamp = "2026-10-30T10:00:00.000Z";
const conversation = { _id: conversationId, participants: [{ _id: userId, fName: "Me", lName: "User", avatar: null }, { _id: otherId, fName: "Other", lName: "User", avatar: null }], createdAt: timestamp, updatedAt: timestamp };
const message = { _id: "111111111111111111111111", conversationId, senderId: userId, recevierId: otherId, content: "Hello", attachments: [{ url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "private-cloud-id" }], createdAt: timestamp };
const pagination = { page: 1, pages: 1, size: 5 };
const history = { message: "done", conversation, messages: [message], ...pagination };
const json = (value, status = 200) => Response.json(value, { status });
function harness(responses = [], token = "fixture-token") {
  const cache = new Map();
  const calls = [];
  const signOuts = [];
  const state = { cancellations: 0, clears: 0 };
  const queryClient = { cancelQueries: async () => { state.cancellations++; }, clear: () => { state.clears++; } };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const loaded = { exports: {} };
    cache.set(file, loaded.exports);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, {
      module: loaded, exports: loaded.exports, URL, URLSearchParams, Request, Response, Headers, AbortSignal, File, FormData, Event, console,
      process: { env: { AUTH_URL: origin, BACKEND_API_URL: "http://fixture" } }, window: { dispatchEvent: () => {} },
      fetch: async (url, options) => { calls.push({ url: String(url), options }); const response = responses.shift(); assert.ok(response, `Unexpected fetch ${url}`); if (response instanceof Error) throw response; return response; },
      require: (name) => {
        if (name === "server-only") return {};
        if (name === "@/utils/decrypt-token") return { decryptToken: async () => token };
        if (name === "next-auth/react") return { signOut: async (options) => signOuts.push(options) };
        if (name.startsWith("@/")) return load(path.resolve("src", `${name.slice(2)}.ts`));
        return dependency(name);
      },
    }, { filename: file });
    return loaded.exports;
  }
  return { load: (file) => load(path.resolve(file)), calls, signOuts, state, queryClient };
}
function request(suffix = "", method = "GET", body, requestOrigin = origin) {
  return new Request(`${origin}/api/conversations${suffix}`, { method, headers: method === "GET" ? {} : { origin: requestOrigin, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
}
const context = (value = conversationId) => ({ params: Promise.resolve({ conversationId: value }) });
const listRoute = "src/app/api/conversations/route.ts";
const chatRoute = "src/app/api/conversations/[conversationId]/messages/route.ts";
async function responseData(response, status) { assert.equal(response.status, status); assert.equal(response.headers.get("Cache-Control"), "private, no-store"); return response.json(); }

async function main() {
  const schemas = harness().load("src/schema/conversationSchema.ts");
  const image = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
  for (const attachments of [[], [{ url: image, publicId: "private-cloud-id" }], [image, { url: image, publicId: "private-cloud-id" }, "uploads/private.png"], ["C:\\uploads\\private.png", "file:///private.png", "http://example.test/image.png", "javascript:alert(1)", "not a URL", "https://", "https://user:password@example.test/a.png", "//example.test/a.png"]]) {
    const parsed = schemas.backendConversationMessageSchema.parse({ ...message, content: null, attachments, secret: "private-metadata" });
    assert.equal(parsed.attachmentCount, attachments.length);
    assert.equal(parsed.attachments.length, attachments.length);
    assert.deepEqual(Array.from(parsed.attachments), attachments.map((item) => (typeof item === "object" ? item.url : item) === image ? image : null));
    assert.equal(JSON.stringify(parsed).includes("private"), false);
    assert.equal("secret" in parsed, false);
    assert.equal(parsed.senderId, userId);
  }
  console.log("PASS: zero/one/three images, Cloudinary objects, legacy HTTPS strings, local/unusable URL fallbacks, attachment-only messages, private metadata stripped");

  const imageFile = new File(["fixture image"], "photo.png", { type: "image/png" });
  for (const count of [1, 3]) {
    const form = new FormData();
    for (let index = 0; index < count; index++) form.append("attachments", imageFile);
    const upload = harness([json({ message: "done", chatMessage: { ...message, content: null } }, 201)]);
    const uploaded = await responseData(await upload.load(chatRoute).POST(request(`/${conversationId}/messages`, "POST", form), context()), 201);
    assert.equal(uploaded.chatMessage.content, null);
    assert.equal(upload.calls[0].options.body.getAll("attachments").length, count);
    assert.equal(upload.calls[0].options.body.getAll("attachments")[0].name, "photo.png");
    assert.equal(upload.calls[0].options.headers.Authorization, "Bearer fixture-token");
    assert.equal(upload.calls[0].options.headers["Content-Type"], undefined);
  }
  for (const kind of ["empty", "four", "type", "unknown", "duplicate"]) {
    const form = new FormData();
    if (kind === "four") for (let i = 0; i < 4; i++) form.append("attachments", imageFile);
    if (kind === "type") form.append("attachments", new File(["text"], "text.txt", { type: "text/plain" }));
    if (kind === "unknown") { form.append("content", "hello"); form.append("senderId", otherId); }
    if (kind === "duplicate") { form.append("content", "one"); form.append("content", "two"); }
    const upload = harness();
    await responseData(await upload.load(chatRoute).POST(request(`/${conversationId}/messages`, "POST", form), context()), 400);
    assert.equal(upload.calls.length, 0);
  }
  const form = new FormData(); form.append("attachments", imageFile);
  const noAuth = harness([], null);
  await responseData(await noAuth.load(chatRoute).POST(request(`/${conversationId}/messages`, "POST", form), context()), 401);
  assert.equal(noAuth.calls.length, 0);
  console.log("PASS: multipart image-only sends, three-file limit, MIME validation, unknown/duplicate fields, auth and forwarding");

  let h = harness([json({ message: "done", conversations: [conversation], ...pagination })]);
  let data = await responseData(await h.load(listRoute).GET(request()), 200);
  assert.equal(data.conversations[0].participants[0]._id, userId);
  assert.equal(h.calls[0].url, "http://fixture/conversation?page=1&size=5");
  assert.equal(h.calls[0].options.headers.Authorization, "Bearer fixture-token");
  for (const query of ["page=0", "page=1.5", "size=0", "size=51", "page=9007199254740991&size=50", "direction=sent", "unknown=true"]) {
    h = harness();
    await responseData(await h.load(listRoute).GET(request(`?${query}`)), 400);
    assert.equal(h.calls.length, 0);
  }
  h = harness([], null);
  await responseData(await h.load(listRoute).GET(request()), 401);
  assert.equal(h.calls.length, 0);
  h = harness([json({ message: "done", conversations: [], page: 1, pages: 0, size: 5 })]);
  data = await responseData(await h.load(listRoute).GET(request()), 200);
  assert.equal(data.conversations.length, 0);
  h = harness([json(history)]);
  data = await responseData(await h.load(chatRoute).GET(request(`/${conversationId}/messages?page=2&size=5`), context()), 200);
  assert.equal(data.messages[0].senderId, userId);
  assert.equal(data.messages[0].attachmentCount, 1);
  assert.equal(data.messages[0].attachments[0], "https://res.cloudinary.com/demo/image/upload/sample.jpg");
  assert.equal(JSON.stringify(data).includes("publicId"), false);
  assert.equal(JSON.stringify(data).includes("uploads/"), false);
  assert.match(h.calls[0].url, /messages\?page=2&size=5$/);
  h = harness();
  await responseData(await h.load(chatRoute).GET(request("/invalid/messages"), context("invalid")), 400);
  assert.equal(h.calls.length, 0);
  for (const input of [{ content: " " }, { content: "a".repeat(5001) }, { content: "Hello", senderId: otherId }, {}]) {
    h = harness();
    await responseData(await h.load(chatRoute).POST(request(`/${conversationId}/messages`, "POST", input), context()), 400);
    assert.equal(h.calls.length, 0);
  }
  h = harness();
  await responseData(await h.load(chatRoute).POST(request(`/${conversationId}/messages`, "POST", { content: "Hello" }, "http://wrong.test"), context()), 403);
  await responseData(await h.load(chatRoute).POST(request(`/${conversationId}/messages?extra=true`, "POST", { content: "Hello" }), context()), 400);
  assert.equal(h.calls.length, 0);
  h = harness([json({ message: "done", chatMessage: message }, 201)]);
  data = await responseData(await h.load(chatRoute).POST(request(`/${conversationId}/messages`, "POST", { content: " Hello " }), context()), 201);
  assert.equal(data.chatMessage.senderId, userId);
  assert.equal(h.calls[0].options.method, "POST");
  assert.equal(h.calls[0].options.body.get("content"), "Hello");
  assert.equal(h.calls[0].options.headers["Content-Type"], undefined);
  assert.equal(JSON.stringify(data).includes("uploads/"), false);
  h = harness([json({ message: "error", error: "conversation not found" }, 404)]);
  data = await responseData(await h.load(chatRoute).GET(request(`/${conversationId}/messages`), context()), 404);
  assert.equal(data.message, "conversation not found");
  for (const [response, status] of [[json({ invalid: true }), 502], [new Error("Network down"), 503]]) {
    h = harness([response]);
    await responseData(await h.load(listRoute).GET(request()), status);
  }
  console.log("PASS: conversation routes, pagination bounds, missing auth, origin, text validation, server-derived identity, attachment privacy, original backend errors, invalid responses/transport");

  const clientPath = "src/features/conversations/api.ts";
  const publicMessage = { ...message, attachments: [null], attachmentCount: 1 };
  const sent = { message: "done", chatMessage: publicMessage };
  h = harness([json({ message: "jwt expired" }, 500), json({ message: "done" }), json(sent, 201)]);
  await h.load(clientPath).sendConversationMessage(conversationId, { content: "Hello", attachments: [imageFile] }, h.queryClient);
  assert.deepEqual(h.calls.map((call) => call.url), [`/api/conversations/${conversationId}/messages`, "/api/auth/refresh", `/api/conversations/${conversationId}/messages`]);
  assert.equal(h.calls[0].options.body, h.calls[2].options.body);
  assert.equal(h.calls[2].options.body.getAll("attachments")[0].name, "photo.png");
  assert.equal(h.calls[2].options.body.get("content"), "Hello");
  h = harness([json({ message: "Session ended" }, 401)]);
  await assert.rejects(h.load(clientPath).fetchConversations(1, 5, h.queryClient), { message: "Session ended" });
  assert.equal(h.state.cancellations, 1);
  assert.equal(h.state.clears, 1);
  assert.equal(h.signOuts.length, 1);
  h = harness([new Error("Network")]);
  await assert.rejects(h.load(clientPath).sendConversationMessage(conversationId, { content: "Hello", attachments: [] }, h.queryClient), { message: "Unable to reach the message service." });
  assert.equal(h.calls.length, 1);
  const signal = new AbortController().signal;
  h = harness([json({ ...history, messages: [publicMessage] })]);
  await h.load(clientPath).fetchConversationMessages(conversationId, 1, 5, h.queryClient, signal);
  assert.equal(h.calls[0].options.signal, signal);
  console.log("PASS: conversation client cancellation, retry-free send transport failure, one renewal/retry with preserved body, terminal401 cache cleanup/signout");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

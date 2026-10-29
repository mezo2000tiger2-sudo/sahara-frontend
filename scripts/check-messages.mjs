import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

// Execute the real route/helper/schema code with only transport and cookie access replaced.
const dependency = createRequire(import.meta.url);
const origin = "http://127.0.0.1:3011";
const messageId = "111111111111111111111111";
const requestId = "222222222222222222222222";
const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const timestamp = "2026-10-29T10:00:00.000Z";
const message = { _id: messageId, recevierId: userId, content: "Hello", attachments: ["private/image.png"], senderId: userId, secret: "hidden", conversationId: null, createdAt: timestamp, updatedAt: timestamp };
const identity = { _id: requestId, messageId, status: "pending", requester: { _id: userId, fName: "Test", lName: "User", avatar: "private/avatar.png", email: "hidden@example.test" }, createdAt: timestamp, updatedAt: timestamp };
const json = (value, status = 200) => Response.json(value, { status });

function harness(responses = [], token = "fixture-token") {
  const cache = new Map();
  const calls = [];
  const signOuts = [];
  const events = [];
  const state = { clears: 0, cancellations: 0 };
  const queryClient = { cancelQueries: async () => { state.cancellations++; }, clear: () => { state.clears++; } };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule.exports);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, {
      module: loadedModule, exports: loadedModule.exports, URL, URLSearchParams, Request, Response, Headers, AbortSignal, File, FormData, Event, console,
      process: { env: { AUTH_URL: origin, BACKEND_API_URL: "http://fixture" } },
      window: { dispatchEvent: (event) => events.push(event.type) },
      fetch: async (url, options) => {
        calls.push({ url: String(url), options });
        const response = responses.shift();
        assert.ok(response, `Unexpected request: ${url}`);
        if (response instanceof Error) throw response;
        return response;
      },
      require: (name) => {
        if (name === "server-only") return {};
        if (name === "@/utils/decrypt-token") return { decryptToken: async () => token };
        if (name === "next-auth/react") return { signOut: async (options) => signOuts.push(options) };
        if (name === "@/features/messages/queries") return {};
        if (name.startsWith("@/")) return load(path.resolve("src", `${name.slice(2)}.ts`));
        return dependency(name);
      },
    }, { filename: file });
    return loadedModule.exports;
  }
  return { load: (file) => load(path.resolve(file)), calls, signOuts, events, state, queryClient };
}
function request(route, method = "GET", body, requestOrigin = origin) {
  return new Request(`${origin}${route}`, { method, headers: method === "GET" ? {} : { origin: requestOrigin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function checkResponse(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  return response.json();
}

async function main() {
  let h = harness([json({ message: "done", data: { messages: [message], page: 1, pages: 1, size: 5 } })]);
  let route = h.load("src/app/api/messages/route.ts");
  let data = await checkResponse(await route.GET(request("/api/messages")), 200);
  assert.equal(data.data.messages[0].attachmentCount, 1);
  assert.equal(JSON.stringify(data).includes("private/"), false);
  assert.equal("senderId" in data.data.messages[0], false);
  assert.equal("secret" in data.data.messages[0], false);
  assert.match(h.calls[0].url, /get-messages\?page=1&size=5$/);
  assert.equal(h.calls[0].options.headers.Authorization, "Bearer fixture-token");
  for (const query of ["page=0", "page=1.5", "size=0", "size=51", "direction=other", "page=9007199254740991&size=50", "unknown=true"]) {
    h = harness();
    route = h.load("src/app/api/messages/route.ts");
    await checkResponse(await route.GET(request(`/api/messages?${query}`)), 400);
    assert.equal(h.calls.length, 0);
  }
  h = harness([], null);
  await checkResponse(await h.load("src/app/api/messages/route.ts").GET(request("/api/messages")), 401);
  h = harness([json({ message: "done", data: { messages: [], page: 1, pages: 0, size: 5 } })]);
  await checkResponse(await h.load("src/app/api/messages/route.ts").GET(request("/api/messages?direction=sent")), 200);
  assert.match(h.calls[0].url, /get-sent-messages/);
  h = harness([json({ message: "error", error: "Backend original error", details: [{ path: "page", message: "Backend detail" }] }, 429)]);
  data = await checkResponse(await h.load("src/app/api/messages/route.ts").GET(request("/api/messages")), 429);
  assert.equal(data.message, "Backend original error");
  assert.equal(data.details[0].message, "Backend detail");
  for (const [response, status] of [[json({ invalid: true }), 502], [new Error("Transport down"), 503]]) {
    h = harness([response]);
    await checkResponse(await h.load("src/app/api/messages/route.ts").GET(request("/api/messages")), status);
  }
  h = harness([json({ message })]);
  route = h.load("src/app/api/messages/[messageId]/route.ts");
  data = await checkResponse(await route.GET(request(`/api/messages/${messageId}`), { params: Promise.resolve({ messageId }) }), 200);
  assert.equal(data.message.attachmentCount, 1);
  await checkResponse(await route.GET(request("/api/messages/invalid"), { params: Promise.resolve({ messageId: "invalid" }) }), 400);

  h = harness();
  route = h.load("src/app/api/identity-requests/route.ts");
  await checkResponse(await route.POST(request("/api/identity-requests", "POST", { messageId }, "http://wrong.test")), 403);
  await checkResponse(await route.POST(request("/api/identity-requests", "POST", { messageId: "invalid" })), 400);
  assert.equal(h.calls.length, 0);
  for (const status of [201, 200]) {
    h = harness([json({ message: "done", request: identity, conversationId: null }, status)]);
    data = await checkResponse(await h.load("src/app/api/identity-requests/route.ts").POST(request("/api/identity-requests", "POST", { messageId })), status);
    assert.equal(data.request.status, "pending");
    assert.equal("avatar" in data.request.requester, false);
    assert.equal("email" in data.request.requester, false);
  }
  h = harness([json({ message: "done", requests: [{ ...identity, conversationId: null }], page: 1, pages: 1, size: 5 })]);
  data = await checkResponse(await h.load("src/app/api/identity-requests/route.ts").GET(request("/api/identity-requests?direction=sent")), 200);
  assert.equal(data.requests.length, 1);
  assert.match(h.calls[0].url, /direction=sent/);
  h = harness([json({ message: "done", request: { ...identity, status: "accepted" }, conversationId: "cccccccccccccccccccccccc" })]);
  route = h.load("src/app/api/identity-requests/[requestId]/route.ts");
  await checkResponse(await route.PATCH(request(`/api/identity-requests/${requestId}`, "PATCH", { status: "unknown" }), { params: Promise.resolve({ requestId }) }), 400);
  data = await checkResponse(await route.PATCH(request(`/api/identity-requests/${requestId}`, "PATCH", { status: "accepted" }), { params: Promise.resolve({ requestId }) }), 200);
  assert.equal(data.request.status, "accepted");
  assert.equal(data.conversationId, "cccccccccccccccccccccccc");
  assert.equal(h.calls[0].options.method, "PATCH");
  console.log("PASS: message/identity routes, pagination boundaries, auth/origin, original errors, attachment/privacy allowlists, success envelopes, decision validation");

  const clientPath = "src/features/messages/api.ts";
  const result = { message: "done", request: identity, conversationId: null };
  h = harness([json({ message: "jwt expired" }, 500), json({ message: "done" }), json(result)]);
  await h.load(clientPath).requestIdentity(messageId, h.queryClient);
  assert.deepEqual(h.calls.map((call) => call.url), ["/api/identity-requests", "/api/auth/refresh", "/api/identity-requests"]);
  assert.equal(h.calls[0].options.body, h.calls[2].options.body);
  assert.equal(h.calls[0].options.method, h.calls[2].options.method);
  assert.deepEqual(h.events, ["session-renewal-start", "session-renewal-end"]);
  h = harness([json({ message: "jwt expired" }, 500), json({ message: "done" }), json({ message: "jwt expired" }, 500)]);
  await assert.rejects(h.load(clientPath).requestIdentity(messageId, h.queryClient), { message: "jwt expired" });
  assert.equal(h.calls.length, 3);
  h = harness([json({ message: "jwt expired" }, 500), json({ message: "Refresh unavailable" }, 503)]);
  await assert.rejects(h.load(clientPath).requestIdentity(messageId, h.queryClient), { message: "Refresh unavailable" });
  assert.equal(h.signOuts.length, 0);
  h = harness([json({ message: "Session ended" }, 401)]);
  await assert.rejects(h.load(clientPath).requestIdentity(messageId, h.queryClient), { message: "Session ended" });
  assert.equal(h.state.clears, 1);
  assert.equal(h.state.cancellations, 1);
  assert.equal(h.signOuts.length, 1);
  h = harness([new Error("Network")]);
  await assert.rejects(h.load(clientPath).requestIdentity(messageId, h.queryClient), { message: "Unable to reach the message service." });
  assert.equal(h.calls.length, 1, "Transport errors must not retry mutations");
  h = harness([json({ invalid: true })]);
  await assert.rejects(h.load(clientPath).requestIdentity(messageId, h.queryClient), { message: "Invalid response from the message service." });
  const signal = new AbortController().signal;
  h = harness([json({ message: "done", data: { messages: [], page: 1, pages: 0, size: 5 } })]);
  await h.load(clientPath).fetchMessages("received", 1, 5, h.queryClient, signal);
  assert.equal(h.calls[0].options.signal, signal);
  console.log("PASS: client renew/retry once, preserved mutation, terminal401 cache reset/signout, retry-free transport failure, invalid response, cancellation signal");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

// Loopback-only fixtures for the real Next app; no requests reach the real backend.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";

const appPort = Number(process.env.CONVERSATION_REVIEW_APP_PORT ?? 3011);
const fixturePort = Number(process.env.CONVERSATION_REVIEW_FIXTURE_PORT ?? 4011);
const origin = `http://127.0.0.1:${appPort}`;
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
process.env.AUTH_URL = origin;
process.env.AUTH_TRUST_HOST = "true";
process.env.BACKEND_API_URL = `http://127.0.0.1:${fixturePort}`;
const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const otherId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const conversationId = "cccccccccccccccccccccccc";
const timestamp = "2026-10-30T10:00:00.000Z";
const id = (value) => value.toString(16).padStart(24, "0");
const token = () => `review.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
const participants = [{ _id: userId, fName: "Review", lName: "User", avatar: null }, { _id: otherId, fName: "Sara", lName: "Ahmed", avatar: null }];
const conversation = { _id: conversationId, participants, createdAt: timestamp, updatedAt: timestamp };
let scenario;
let calls;
let messages;
let renewed;
function reset(name = "normal") {
  scenario = name;
  calls = [];
  renewed = false;
  messages = Array.from({ length: 12 }, (_, index) => ({
    _id: id(index + 1), conversationId, senderId: index % 2 ? userId : otherId,
    recevierId: index % 2 ? otherId : userId, content: `Conversation message ${index + 1}`,
    attachments: index === 0 ? ["uploads/private-image.png"] : [],
    createdAt: new Date(Date.parse(timestamp) + index * 60_000).toISOString(),
  })).reverse();
}
reset();
const json = (res, value, status = 200) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(value)); };
const fail = (res, error, status = 400) => json(res, { message: "error", error }, status);
const paginate = (items, url) => {
  const page = Number(url.searchParams.get("page") ?? 1);
  const size = Number(url.searchParams.get("size") ?? 5);
  return { batch: items.slice((page - 1) * size, page * size), page, pages: Math.ceil(items.length / size), size };
};
async function body(req) { let value = ""; for await (const chunk of req) value += chunk; return JSON.parse(value || "{}"); }
const fixture = http.createServer(async (req, res) => {
  const url = new URL(req.url, process.env.BACKEND_API_URL);
  try {
    if (url.pathname === "/__review/login") {
      const cookieName = "authjs.session-token";
      const session = await encode({ secret: process.env.AUTH_SECRET, salt: cookieName, maxAge: 3600, token: {
        name: "Review User", email: "review@example.test", sub: "review@example.test",
        accessToken: token(), refreshToken: token(), accessTokenExpiresAt: Date.now() + 3600_000, refreshTokenExpiresAt: Date.now() + 86400_000,
      } });
      res.writeHead(302, { "Set-Cookie": `${cookieName}=${session}; Path=/; HttpOnly; SameSite=Lax`, Location: `${origin}/conversation` });
      return res.end();
    }
    if (url.pathname === "/__review/scenario") {
      const name = url.searchParams.get("name") ?? "normal";
      if (!["normal", "empty", "list-error", "history-error", "next-error", "send-error", "malformed", "unauthorized", "expired-once", "transport"].includes(name)) return fail(res, "Unknown scenario");
      reset(name);
      return json(res, { scenario });
    }
    if (url.pathname === "/__review/state") return json(res, { scenario, calls, messages });
    if (url.pathname === "/__review/incoming") {
      const message = { _id: id(100 + messages.length), conversationId, senderId: otherId, recevierId: userId, content: "Incoming polling reply", attachments: [], createdAt: new Date().toISOString() };
      messages.unshift(message);
      return json(res, { inserted: message._id });
    }
    calls.push({ method: req.method, path: url.pathname, query: url.search });
    if (!req.headers.authorization?.startsWith("Bearer ")) return fail(res, "authorization is required", 401);
    if (scenario === "unauthorized") return fail(res, "Your session expired", 401);
    if (url.pathname === "/user/profile") return json(res, { message: "done", user: { ...participants[0], email: "review@example.test", providor: "system", age: 25 } });
    if (url.pathname === "/user/refresh-token") return json(res, { token: { token_access: token() } });
    if (scenario === "expired-once" && !renewed) { renewed = true; return fail(res, "jwt expired", 500); }
    if (scenario === "transport") return req.socket.destroy();
    if (scenario === "malformed") return json(res, { unexpected: "fixture malformed response" });
    if (url.pathname === "/conversation" && req.method === "GET") {
      if (scenario === "list-error") return fail(res, "Fixture conversations unavailable", 503);
      const { batch, ...pagination } = paginate(scenario === "empty" ? [] : [conversation], url);
      return json(res, { message: "done", conversations: batch, ...pagination });
    }
    if (/^\/conversation\/[^/]+\/messages$/.test(url.pathname)) {
      if (url.pathname.split("/")[2] !== conversationId) return fail(res, "conversation not found", 404);
      if (req.method === "GET") {
        if (scenario === "history-error" || (scenario === "next-error" && Number(url.searchParams.get("page")) > 1)) return fail(res, "Fixture history unavailable", 503);
        const { batch, ...pagination } = paginate(scenario === "empty" ? [] : messages, url);
        return json(res, { message: "done", conversation, messages: batch, ...pagination });
      }
      if (req.method === "POST") {
        if (scenario === "send-error") return fail(res, "Fixture sending unavailable", 503);
        const { content, ...extra } = await body(req);
        if (typeof content !== "string" || !content.trim() || content.trim().length > 5000 || Object.keys(extra).length) return fail(res, "invalid content");
        const message = { _id: id(100 + messages.length), conversationId, senderId: userId, recevierId: otherId, content: content.trim(), attachments: [], createdAt: new Date().toISOString() };
        messages.unshift(message);
        return json(res, { message: "done", chatMessage: message }, 201);
      }
    }
    return fail(res, "Fixture endpoint not modeled", 501);
  } catch (error) { return fail(res, error.message, 500); }
});
await new Promise((resolve, reject) => fixture.listen(fixturePort, "127.0.0.1", resolve).once("error", reject));
if (process.argv.includes("--fixtures-only")) {
  console.log(`Fixtures only: http://127.0.0.1:${fixturePort}`);
} else {
  const { default: next } = await import("next");
  const app = next({ dev: true, hostname: "127.0.0.1", port: appPort });
  await app.prepare();
  const server = http.createServer(app.getRequestHandler());
  await new Promise((resolve, reject) => server.listen(appPort, "127.0.0.1", resolve).once("error", reject));
  console.log(`CONVERSATION REVIEW READY: http://127.0.0.1:${fixturePort}/__review/login`);
  const stop = async () => { server.close(); fixture.close(); await app.close(); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

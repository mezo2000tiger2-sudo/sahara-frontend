// Loopback-only fixtures for reviewing the real Next app. Never uses the real backend.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";

const appPort = Number(process.env.MESSAGE_REVIEW_APP_PORT ?? 3011);
const fixturePort = Number(process.env.MESSAGE_REVIEW_FIXTURE_PORT ?? 4011);
const origin = `http://127.0.0.1:${appPort}`;
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
process.env.AUTH_URL = origin;
process.env.AUTH_TRUST_HOST = "true";
process.env.BACKEND_API_URL = `http://127.0.0.1:${fixturePort}`;

const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const otherId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const conversationId = "cccccccccccccccccccccccc";
const id = (number) => number.toString(16).padStart(24, "0");
const timestamp = "2026-10-29T10:00:00.000Z";
const token = () => `review.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
let scenario = "normal";
let messages;
let requests;
let calls;
let expired;

function reset(name = "normal") {
  scenario = name;
  calls = [];
  expired = false;
  messages = Array.from({ length: 19 }, (_, index) => ({
    _id: id(index + 1), recevierId: index < 12 ? userId : otherId,
    _senderId: index === 0 ? null : index < 12 ? otherId : userId,
    content: index === 1 ? undefined : `Fixture message ${index + 1}\n${"A thoughtful message for browser review. ".repeat(index === 2 ? 40 : 3)}`,
    attachments: index === 1 || index === 3 ? ["uploads/messageAttachments/private-image.png"] : [],
    conversationId: null, createdAt: timestamp, updatedAt: timestamp,
  }));
  requests = [
    { _id: id(101), messageId: id(13), status: "pending", createdAt: timestamp, updatedAt: timestamp },
    { _id: id(102), messageId: id(14), status: "pending", createdAt: timestamp, updatedAt: timestamp },
    { _id: id(103), messageId: id(3), status: "pending", createdAt: timestamp, updatedAt: timestamp },
  ];
}
reset();

const json = (res, body, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};
const fail = (res, error, status = 400) => json(res, { message: "error", error }, status);
const visibleMessage = (message) => {
  const visible = { ...message };
  delete visible._senderId;
  return visible;
};
const requestResult = (request) => ({
  ...request,
  requester: { _id: messages.find((message) => message._id === request.messageId).recevierId, fName: "Review", lName: "Requester", avatar: null },
});
const paginate = (items, url) => {
  const page = Number(url.searchParams.get("page") ?? 1);
  const size = Number(url.searchParams.get("size") ?? 5);
  return { items: items.slice((page - 1) * size, page * size), page, pages: Math.ceil(items.length / size), size };
};
async function body(req) {
  let data = "";
  for await (const chunk of req) data += chunk;
  return JSON.parse(data || "{}");
}

const fixture = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${fixturePort}`);
  try {
    if (url.pathname === "/__review/login") {
      const cookieName = "authjs.session-token";
      const session = await encode({ secret: process.env.AUTH_SECRET, salt: cookieName, maxAge: 3600, token: {
        name: "Review User", email: "review@example.test", sub: userId,
        accessToken: token(), refreshToken: token(), accessTokenExpiresAt: Date.now() + 3600_000,
        refreshTokenExpiresAt: Date.now() + 86400_000,
      } });
      res.writeHead(302, { "Set-Cookie": `${cookieName}=${session}; Path=/; HttpOnly; SameSite=Lax`, Location: `${origin}/message` });
      return res.end();
    }
    if (url.pathname === "/__review/scenario") {
      const name = url.searchParams.get("name") ?? "normal";
      if (!["normal", "empty", "list-error", "next-error", "malformed", "expired-once", "unauthorized", "transport", "decision-error"].includes(name)) return fail(res, "Unknown scenario");
      reset(name);
      return json(res, { scenario });
    }
    if (url.pathname === "/__review/state") return json(res, { scenario, calls, requests, conversationCreated: messages.some((message) => message.conversationId) });
    calls.push({ method: req.method, path: url.pathname, query: url.search });
    if (url.pathname === "/user/refresh-token") return json(res, { token: { token_access: token() } });
    if (!req.headers.authorization?.startsWith("Bearer ")) return fail(res, "authorization is required", 401);
    if (scenario === "unauthorized") return fail(res, "Your session expired", 401);
    if (url.pathname === "/user/profile") return json(res, { message: "done", user: {
      _id: userId, fName: "Review", lName: "User", email: "review@example.test", providor: "system", age: 25,
    } });
    if (scenario === "transport") return req.socket.destroy();
    if (scenario === "expired-once" && !expired) {
      expired = true;
      return fail(res, "jwt expired", 500);
    }
    if (scenario === "malformed") return json(res, { unexpected: "fixture malformed response" });
    if (url.pathname === "/message/get-messages" || url.pathname === "/message/get-sent-messages") {
      if (scenario === "list-error" || (scenario === "next-error" && Number(url.searchParams.get("page")) > 1)) return fail(res, "Fixture messages unavailable", 503);
      const received = url.pathname.endsWith("/get-messages");
      const items = scenario === "empty" ? [] : messages.filter((message) => !message.conversationId && (received ? message.recevierId === userId : message._senderId === userId)).map(visibleMessage);
      const { items: batch, ...pagination } = paginate(items, url);
      return json(res, { message: "done", data: { messages: batch, ...pagination } });
    }
    if (url.pathname.startsWith("/message/get-message-by-id/")) {
      const message = messages.find((item) => item._id === url.pathname.split("/").at(-1));
      if (!message) return fail(res, "message not found", 404);
      return json(res, { message: visibleMessage(message) });
    }
    if (url.pathname === "/identity-request" && req.method === "GET") {
      const direction = url.searchParams.get("direction") ?? "received";
      const items = scenario === "empty" ? [] : requests.filter((request) => {
        const message = messages.find((item) => item._id === request.messageId);
        return direction === "received" ? message._senderId === userId : message.recevierId === userId;
      }).map((request) => ({ ...requestResult(request), conversationId: request.status === "accepted" ? conversationId : null }));
      const { items: batch, ...pagination } = paginate(items, url);
      return json(res, { message: "done", requests: batch, ...pagination });
    }
    if (url.pathname === "/identity-request" && req.method === "POST") {
      const { messageId } = await body(req);
      const message = messages.find((item) => item._id === messageId && item.recevierId === userId);
      if (!message) return fail(res, "message not found", 404);
      if (!message._senderId) return fail(res, "sender is not logged in", 409);
      let request = requests.find((item) => item.messageId === messageId);
      const status = request ? 200 : 201;
      if (!request) {
        request = { _id: id(200 + requests.length), messageId, status: "pending", createdAt: timestamp, updatedAt: timestamp };
        requests.push(request);
      }
      return json(res, { message: "done", request: requestResult(request), conversationId: request.status === "accepted" ? conversationId : null }, status);
    }
    if (url.pathname.startsWith("/identity-request/") && req.method === "PATCH") {
      if (scenario === "decision-error") return fail(res, "Fixture decision unavailable", 503);
      const request = requests.find((item) => item._id === url.pathname.split("/").at(-1));
      const message = messages.find((item) => item._id === request?.messageId);
      if (!request || message._senderId !== userId) return fail(res, "request not found", 404);
      const { status } = await body(req);
      if (!["accepted", "rejected"].includes(status)) return fail(res, "invalid status");
      if (request.status !== "pending" && request.status !== status) return fail(res, "request already decided", 409);
      request.status = status;
      if (status === "accepted") message.conversationId = conversationId;
      return json(res, { message: "done", request: requestResult(request), conversationId: status === "accepted" ? conversationId : null });
    }
    return fail(res, "Fixture endpoint not modeled", 501);
  } catch (error) {
    fail(res, error.message, 500);
  }
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
  console.log(`REVIEW READY: http://127.0.0.1:${fixturePort}/__review/login`);
  console.log(`Scenario control: http://127.0.0.1:${fixturePort}/__review/scenario?name=normal`);
  console.log(`Synthetic user: ${userId}; message IDs 000000000000000000000001 through 000000000000000000000013`);
  const stop = async () => { server.close(); fixture.close(); await app.close(); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

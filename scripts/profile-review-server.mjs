// Loopback-only profile fixtures; never sends uploads to the real backend.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";

const origin = "http://127.0.0.1:3012";
const fixtureOrigin = "http://127.0.0.1:4012";
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
process.env.AUTH_URL = origin;
process.env.AUTH_TRUST_HOST = "true";
process.env.BACKEND_API_URL = fixtureOrigin;
const user = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", fName: "Profile", lName: "Reviewer", email: "review@example.test", age: 25, gender: "female", providor: "system", avatar: null, coverImage: null };
let scenario = "normal";
let uploads = [];
let saved = false;
let expired = false;
const token = () => `review.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
const json = (res, value, status = 200) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(value)); };
const fixture = http.createServer(async (req, res) => {
  const url = new URL(req.url, fixtureOrigin);
  try {
    if (url.pathname === "/__review/login") {
      const name = "authjs.session-token";
      const session = await encode({ secret: process.env.AUTH_SECRET, salt: name, maxAge: 3600, token: {
        name: "Profile Reviewer", email: user.email, sub: user.email,
        accessToken: token(), refreshToken: token(), accessTokenExpiresAt: Date.now() + 3600_000, refreshTokenExpiresAt: Date.now() + 86400_000,
      } });
      res.writeHead(302, { "Set-Cookie": `${name}=${session}; Path=/; HttpOnly; SameSite=Lax`, Location: `${origin}/profile` });
      return res.end();
    }
    if (url.pathname === "/__review/scenario") {
      scenario = url.searchParams.get("name") ?? "normal"; saved = false; expired = false;
      if (scenario === "missing") { user.avatar = null; user.coverImage = null; }
      if (scenario === "broken") { user.avatar = `${fixtureOrigin}/broken`; user.coverImage = `${fixtureOrigin}/broken`; }
      return json(res, { scenario });
    }
    if (url.pathname === "/__review/state") return json(res, { scenario, uploads, user });
    if (url.pathname.startsWith("/image/")) {
      res.writeHead(200, { "Content-Type": "image/png" });
      return res.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64"));
    }
    if (url.pathname === "/user/refresh-token") return json(res, { token: { token_access: token() } });
    if (url.pathname === "/user/profile" || url.pathname.startsWith("/user/share-profile/")) {
      if (scenario === "refresh-error" && saved) return json(res, { error: "Fixture profile refresh unavailable" }, 503);
      return json(res, { message: "done", user });
    }
    if (url.pathname === "/user/update-profile" && req.method === "PATCH") {
      if (scenario === "expired-once" && !expired) { expired = true; return json(res, { error: "jwt expired" }, 500); }
      if (scenario === "upload-error") return json(res, { error: "Fixture upload rejected" }, 422);
      if (scenario === "transport") return req.socket.destroy();
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const request = new Request(`${fixtureOrigin}${url.pathname}`, { method: "PATCH", headers: req.headers, body: Buffer.concat(chunks) });
      if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
        const form = await request.formData();
        for (const [field, file] of form) {
          if (!["avatar", "coverImage"].includes(field) || !(file instanceof File)) return json(res, { error: "Invalid fixture upload" }, 400);
          uploads.push({ field, name: file.name, size: file.size });
          user[field] = [{ url: `${fixtureOrigin}/image/${field}-${uploads.length}.png`, publicId: "private-storage-id" }];
        }
      } else Object.assign(user, await request.json());
      saved = true;
      return json(res, { message: "done", updatedUser: { password: "must-not-reach-browser" } }, 201);
    }
    return json(res, { error: "Fixture endpoint not modeled" }, 501);
  } catch (error) { return json(res, { error: error.message }, 500); }
});
await new Promise((resolve, reject) => fixture.listen(4012, "127.0.0.1", resolve).once("error", reject));
const { default: next } = await import("next");
const app = next({ dev: true, hostname: "127.0.0.1", port: 3012 });
await app.prepare();
const server = http.createServer(app.getRequestHandler());
await new Promise((resolve, reject) => server.listen(3012, "127.0.0.1", resolve).once("error", reject));
console.log(`PROFILE REVIEW READY: ${fixtureOrigin}/__review/login`);
const stop = async () => { server.close(); fixture.close(); await app.close(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

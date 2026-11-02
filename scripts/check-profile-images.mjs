import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const dependency = createRequire(import.meta.url);

// Execute the real modules with only transport, session and server-only boundaries replaced.
function loader({ fetch = globalThis.fetch, token = "test-token" } = {}) {
  const cache = new Map();
  return function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule.exports);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      module: loadedModule, exports: loadedModule.exports, fetch, URL, Headers, Request, Response, FormData, File, AbortSignal, Event,
      process: { env: { AUTH_URL: "http://localhost:3001" } },
      window: { dispatchEvent() {} },
      require: (name) => {
        if (name === "server-only") return {};
        if (name === "next-auth/react") return { signOut: async () => {} };
        if (name === "@/utils/decrypt-token") return { decryptToken: async () => token };
        if (name === "@/lib/backend-api.server") return { backendUrl: (url) => `https://backend.test${url}` };
        if (name.startsWith("@/")) return load(path.join("src", name.slice(2) + ".ts"));
        return dependency(name);
      },
    }, { filename: file });
    return loadedModule.exports;
  };
}

const png = new File([new Uint8Array([137, 80, 78, 71])], "avatar.png", { type: "image/png" });
const jpeg = new File([new Uint8Array([255, 216, 255])], "cover.jpg", { type: "image/jpeg" });
const form = (entries) => {
  const data = new FormData();
  for (const [field, file] of entries) data.append(field, file);
  return data;
};
const request = (body, origin = "http://localhost:3001") => new Request("http://localhost:3001/api/profile", {
  method: "PATCH", headers: { origin }, body,
});

const load = loader();
const { updateProfileImageSchema } = load("src/schema/updateProfileImageSchema.ts");
for (const [field, file] of [["avatar", png], ["coverImage", jpeg]]) {
  assert.equal(updateProfileImageSchema.safeParse({ field, file }).success, true);
}
for (const input of [
  { field: "avatar", file: new File([], "empty.png", { type: "image/png" }) },
  { field: "coverImage", file: new File(["x"], "x.gif", { type: "image/gif" }) },
  { field: "avatar", file: "text" }, { field: "coverImages", file: png },
  { field: "avatar", file: png, extra: true },
]) assert.equal(updateProfileImageSchema.safeParse(input).success, false);

const { profileSchema, publicProfileSchema } = load("src/schema/profileSchema.ts");
const user = { _id: "a".repeat(24), fName: "Test", lName: "User", email: "test@example.com", providor: "system" };
for (const schema of [profileSchema, publicProfileSchema]) {
  for (const [image, expected] of [
    [undefined, null], [null, null], [[], null], ["", null], ["https://img.test/a", "https://img.test/a"],
    [[{ url: "https://img.test/first", publicId: "secret" }, { url: "https://img.test/second" }], "https://img.test/first"],
  ]) {
    const parsed = schema.parse({ ...user, avatar: image, coverImage: image, password: "secret" });
    assert.equal(parsed.avatar, expected);
    assert.equal(parsed.coverImage, expected);
    assert.equal(schema.parse(parsed).coverImage, expected);
    assert.equal(JSON.stringify(parsed).includes("secret"), false);
  }
}

const calls = [];
const route = loader({ fetch: async (url, options) => {
  calls.push({ url, ...options });
  return Response.json({ message: "saved", user: { password: "secret" } });
} })("src/app/api/profile/route.ts");
for (const entries of [
  [], [["avatar", png], ["avatar", png]], [["avatar", png], ["coverImage", jpeg]],
  [["avatar", png], ["extra", "text"]], [["extra", png]], [["avatar", "text"]],
  [["avatar", new File([], "empty.png", { type: "image/png" })]],
  [["avatar", new File(["x"], "x.gif", { type: "image/gif" })]],
]) {
  const invalidResponse = await route.PATCH(request(form(entries)));
  assert.equal(invalidResponse.status, 400, JSON.stringify(await invalidResponse.json()));
  assert.equal(calls.length, 0, "Invalid request must not reach backend");
}
assert.equal((await route.PATCH(request(form([["avatar", png]]), "https://other.test"))).status, 403);
assert.equal(calls.length, 0);
const malformed = request("malformed multipart body");
malformed.headers.set("content-type", "multipart/form-data; boundary=missing");
assert.equal((await route.PATCH(malformed)).status, 400);
assert.equal(calls.length, 0);
const unauthenticated = loader({ token: null, fetch: () => { throw Error("Unexpected backend call"); } })("src/app/api/profile/route.ts");
let parsedBody = false;
const rejectedRequest = { url: "http://localhost:3001/api/profile", headers: new Headers({ origin: "http://localhost:3001" }),
  formData: () => { parsedBody = true; }, json: () => { parsedBody = true; } };
assert.equal((await unauthenticated.PATCH(rejectedRequest)).status, 401);
assert.equal(parsedBody, false, "Authentication precedes parsing");
rejectedRequest.headers.set("origin", "https://other.test");
assert.equal((await route.PATCH(rejectedRequest)).status, 403);
assert.equal(parsedBody, false, "Origin checking precedes parsing");
for (const [field, file] of [["avatar", png], ["coverImage", jpeg]]) {
  const response = await route.PATCH(request(form([[field, file]])));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { message: "saved" });
  const forwarded = calls.at(-1);
  assert.equal(forwarded.method, "PATCH");
  assert.equal(forwarded.headers.Authorization, "Bearer test-token");
  assert.equal(forwarded.headers["Content-Type"], undefined);
  assert.deepEqual([...forwarded.body.keys()], [field]);
  assert.equal(forwarded.body.get(field).size, file.size);
  // Native fetch supplies the multipart boundary for the forwarded FormData.
  assert.match(new Request(forwarded.url, forwarded).headers.get("content-type"), /multipart\/form-data; boundary=/);
}
const jsonRequest = request(JSON.stringify({ fName: "Updated" }));
jsonRequest.headers.set("content-type", "application/json");
assert.equal((await route.PATCH(jsonRequest)).status, 201);
assert.deepEqual(JSON.parse(calls.at(-1).body), { fName: "Updated" });
assert.equal(calls.at(-1).headers["Content-Type"], "application/json");

const replay = [];
const responses = [Response.json({ message: "jwt expired" }, { status: 500 }), Response.json({ message: "renewed" }), Response.json({ message: "saved" })];
const client = loader({ fetch: async (url, options) => {
  replay.push({ url, options });
  return responses.shift();
} })("src/features/profile/api.ts");
assert.equal((await client.saveProfileImage({ field: "avatar", file: png })).message, "saved");
assert.deepEqual(replay.map(({ url }) => url), ["/api/profile", "/api/auth/refresh", "/api/profile"]);
assert.equal(replay[0].options.body, replay[2].options.body);
assert.equal(replay[2].options.body.get("avatar"), png);
assert.equal(replay[2].options.headers, undefined);
const failed = loader({ fetch: async () => Response.json({ error: "backend upload rejected" }, { status: 422 }) })("src/features/profile/api.ts");
await assert.rejects(failed.saveProfileImage({ field: "avatar", file: png }), { message: "backend upload rejected", status: 422 });
const interrupted = loader({ fetch: async () => { throw new TypeError("Connection interrupted"); } })("src/app/api/profile/route.ts");
const interruptedResponse = await interrupted.PATCH(request(form([["avatar", png]])));
assert.equal(interruptedResponse.status, 503);
assert.equal((await interruptedResponse.json()).message, "Unable to reach the profile service.");
console.log("PASS: image validation, normalization and projection, strict multipart rejection, origin/auth before parsing, multipart/JSON forwarding, session renewal replay, backend errors");






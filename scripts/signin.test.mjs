// Run with: node --test scripts/signin.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createRequire } from "node:module";
const dependencyRequire = createRequire(import.meta.url);

// Load the real TypeScript helpers while replacing only Next's server-only marker.
function load(file) {
  const filename = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  const localRequire = (name) => {
    if (name === "server-only") return {};
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
    if (name.startsWith(".")) return load(path.join(path.dirname(filename), `${name}.ts`));
    return dependencyRequire(name);
  };
  new Function("require", "module", "exports", source)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { authenticateWithBackend } = load("src/lib/authenticateWithBackend.ts");
const { authenticationErrorMessage } = load("src/features/auth/errors.ts");
const { signInSchema } = load("src/schema/signinSchema.ts");
const unavailable = "Sign-in is unavailable right now. Please try again.";
const jwt = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
const future = Math.floor(Date.now() / 1000) + 3600;
const valid = { user: { email: "test@example.com" }, token: { token_access: jwt(future), token_refresh: jwt(future + 3600) } };

test("sign-in validates inputs and maps only the framework fallback", () => {
  assert.equal(signInSchema.safeParse({ email: "bad", password: "" }).success, false);
  assert.equal(signInSchema.safeParse({ email: "test@example.com", password: "password" }).success, true);
  assert.equal(authenticationErrorMessage("CredentialsSignin", "credentials"), "The email or password is incorrect.");
  assert.equal(authenticationErrorMessage("CredentialsSignin", "email not exist"), "email not exist");
  assert.equal(authenticationErrorMessage("GoogleBackendError", "original backend error"), "original backend error");
});

test("backend failures are readable, original messages survive, invalid sessions are rejected", async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.BACKEND_API_URL;
  process.env.BACKEND_API_URL = "http://localhost:3999";
  try {
    const cases = [
      ["backend error", { error: "inValid password" }, 401, "inValid password"],
      ["backend message", { message: "account not confirmed" }, 403, "account not confirmed"],
      ["null response", null, 200, unavailable],
      ["missing fields", {}, 200, unavailable],
      ["bad error shape", { error: {} }, 500, unavailable],
      ["malformed token", { ...valid, token: { ...valid.token, token_access: "bad" } }, 200, unavailable],
      ["expired access token", { ...valid, token: { ...valid.token, token_access: jwt(1) } }, 200, unavailable],
      ["expired refresh token", { ...valid, token: { ...valid.token, token_refresh: jwt(1) } }, 200, unavailable],
    ];
    for (const [name, payload, status, message] of cases) {
      global.fetch = async () => Response.json(payload, { status });
      await assert.rejects(authenticateWithBackend("/user/signin", {}), { message }, name);
    }
    global.fetch = async () => new Response("<html>Bad gateway</html>", { status: 502 });
    await assert.rejects(authenticateWithBackend("/user/signin", {}), { message: unavailable });
    global.fetch = async () => { throw new TypeError("fetch failed"); };
    await assert.rejects(authenticateWithBackend("/user/signin", {}), { message: unavailable });
    global.fetch = async (url, options) => {
      assert.equal(url, "http://localhost:3999/user/signin");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(options.body), { email: "test@example.com", password: "password" });
      return Response.json(valid);
    };
    const user = await authenticateWithBackend("/user/signin", { email: "test@example.com", password: "password" });
    assert.equal(user.email, valid.user.email);
    assert.equal(user.accessTokenExpiresAt, future * 1000);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = originalUrl;
  }
});


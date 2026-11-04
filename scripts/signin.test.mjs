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
const invalidResponse = "The sign-in server returned an invalid response.";
const invalidTokens = "The sign-in server returned invalid session tokens.";
const expiredSession = "The sign-in server returned an expired session. Please sign in again.";
const timeout = "The sign-in request timed out. Please try again.";
const jwt = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
const future = Math.floor(Date.now() / 1000) + 3600;
const valid = { user: { email: "test@example.com" }, token: { token_access: jwt(future), token_refresh: jwt(future + 3600) } };

test("sign-in validates inputs and maps only the framework fallback", () => {
  assert.equal(signInSchema.safeParse({ email: "bad", password: "" }).success, false);
  assert.equal(signInSchema.safeParse({ email: "test@example.com", password: "password" }).success, true);
  assert.equal(authenticationErrorMessage("CredentialsSignin", "credentials"), "The email or password is incorrect.");
  assert.equal(authenticationErrorMessage("CredentialsSignin", "email not exist"), "email not exist");
  for (const provider of ["CredentialsSignin", "GoogleBackendError", "GitHubBackendError"]) {
    const message = "  Original backend ERROR\nPlease confirm your account.  ";
    assert.equal(authenticationErrorMessage(provider, message), message);
  }
});

test("backend failures are readable, original messages survive, invalid sessions are rejected", async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.BACKEND_API_URL;
  process.env.BACKEND_API_URL = "http://localhost:3999";
  try {
    const cases = [
      ["backend error", { error: "inValid password" }, 401, "inValid password"],
      ["backend message", { message: "account not confirmed" }, 403, "account not confirmed"],
      ["error takes priority", { error: "inValid password", message: "error" }, 401, "inValid password"],
      ["invalid error with valid message", { error: {}, message: "account not confirmed" }, 403, "account not confirmed"],
      ["valid error with invalid message", { error: "email not exist", message: {} }, 404, "email not exist"],
      ["empty error", { error: "", message: "account not confirmed" }, 403, "account not confirmed"],
      ["blank error", { error: " \n", message: "account not confirmed" }, 403, "account not confirmed"],
      ["exact whitespace", { error: "  Backend ERROR\nTry again.  " }, 400, "  Backend ERROR\nTry again.  "],
      ["exact message whitespace", { message: "  Backend ERROR\nTry again.  " }, 400, "  Backend ERROR\nTry again.  "],
      ["null response", null, 200, invalidResponse],
      ["missing fields", {}, 200, invalidResponse],
      ["bad error shape", { error: {} }, 500, "The sign-in server rejected the request (HTTP 500)."],
      ["missing error", {}, 401, "The sign-in server rejected the request (HTTP 401)."],
      ["null error response", null, 503, "The sign-in server rejected the request (HTTP 503)."],
      ["blank messages", { error: " ", message: "\n" }, 403, "The sign-in server rejected the request (HTTP 403)."],
      ["malformed token", { ...valid, token: { ...valid.token, token_access: "bad" } }, 200, invalidTokens],
      ["malformed refresh token", { ...valid, token: { ...valid.token, token_refresh: "bad" } }, 200, invalidTokens],
      ["expired access token", { ...valid, token: { ...valid.token, token_access: jwt(1) } }, 200, expiredSession],
      ["expired refresh token", { ...valid, token: { ...valid.token, token_refresh: jwt(1) } }, 200, expiredSession],
    ];
    for (const [name, payload, status, message] of cases) {
      global.fetch = async () => Response.json(payload, { status });
      await assert.rejects(authenticateWithBackend("/user/signin", {}), { message }, name);
    }
    global.fetch = async () => new Response("<html>Bad gateway</html>", { status: 502 });
    await assert.rejects(authenticateWithBackend("/user/signin", {}), { message: invalidResponse });
    global.fetch = async () => new Response("not json", { status: 200 });
    await assert.rejects(authenticateWithBackend("/user/signin", {}), { message: invalidResponse });
    global.fetch = async () => { throw new TypeError("fetch failed"); };
    await assert.rejects(authenticateWithBackend("/user/signin", {}), { message: "Could not connect to the sign-in server. Please try again." });
    global.fetch = async () => { throw new DOMException("technical timeout", "TimeoutError"); };
    await assert.rejects(authenticateWithBackend("/user/signin", {}), { message: timeout });
    const originalTimeout = AbortSignal.timeout;
    try {
      const controller = new AbortController();
      AbortSignal.timeout = () => controller.signal;
      global.fetch = async () => ({ json: async () => {
        controller.abort(new DOMException("technical timeout", "TimeoutError"));
        throw new DOMException("body aborted", "AbortError");
      } });
      await assert.rejects(authenticateWithBackend("/user/signin", {}), { message: timeout });
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
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


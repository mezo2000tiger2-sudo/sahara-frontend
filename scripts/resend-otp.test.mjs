// Run with: node --test scripts/resend-otp.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";

const dependency = createRequire(import.meta.url);
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", source)((name) => {
    if (name === "server-only") return {};
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
    return dependency(name);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const { PATCH } = load("src/app/api/auth/resend-otp/route.ts");
const request = (email = "test@example.com", origin = "http://localhost:3001") => new Request("http://localhost:3001/api/auth/resend-otp", {
  method: "PATCH", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ email, otp: "not-forwarded" }),
});

test("resend forwards backend errors and stays silent without a usable backend response", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { BACKEND_API_URL: process.env.BACKEND_API_URL, AUTH_URL: process.env.AUTH_URL };
  process.env.BACKEND_API_URL = "http://backend.test";
  process.env.AUTH_URL = "http://localhost:3001";
  try {
    let forwarded;
    global.fetch = async (url, options) => {
      forwarded = { url, ...options };
      return Response.json({ message: "Done" });
    };
    let response = await PATCH(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: "Done" });
    assert.equal(forwarded.url, "http://backend.test/user/resend-otp");
    assert.equal(forwarded.method, "PATCH");
    assert.deepEqual(JSON.parse(forwarded.body), { email: "test@example.com" });

    for (const [payload, expected] of [
      [{ error: "  Original backend error.  ", details: "30" }, { message: "  Original backend error.  ", retryAfterSeconds: 30 }],
      [{ error: "Blocked", details: "invalid" }, { message: "Blocked" }],
      [{ error: "Blocked", details: {} }, { message: "Blocked" }],
    ]) {
      global.fetch = async () => Response.json(payload, { status: 429 });
      response = await PATCH(request());
      assert.equal(response.status, 429);
      assert.deepEqual(await response.json(), expected);
    }

    for (const result of [
      () => Response.json({}, { status: 500 }),
      () => Response.json({ error: " \n" }, { status: 500 }),
      () => Response.json({ error: {} }, { status: 500 }),
      () => Response.json({ message: "unexpected success" }),
      () => new Response("<html>Gateway error</html>", { status: 502 }),
      () => { throw new TypeError("fetch failed"); },
      () => { throw new DOMException("Timed out", "TimeoutError"); },
    ]) {
      global.fetch = async () => result();
      response = await PATCH(request());
      assert.ok([502, 503].includes(response.status));
      assert.deepEqual(await response.json(), {});
    }

    global.fetch = async () => assert.fail("Invalid requests must not reach the backend");
    response = await PATCH(request("invalid"));
    assert.equal(response.status, 400);
    const validation = await response.json();
    assert.ok(validation.fieldErrors.email.length);
    assert.equal(validation.message, undefined);
    response = await PATCH(request("test@example.com", "http://other.test"));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {});
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

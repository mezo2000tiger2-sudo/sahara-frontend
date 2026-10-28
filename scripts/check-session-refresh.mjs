import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);

function loadClient(fetch, events, signOuts) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule.exports);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(source, {
      module: loadedModule, exports: loadedModule.exports, fetch, Event, AbortSignal,
      window: { dispatchEvent: (event) => events.push(event.type) },
      require: (name) => {
        if (name === "next-auth/react") return { signOut: async () => signOuts.push(true) };
        if (name.startsWith("@/")) return load(path.resolve("src", name.slice(2) + ".ts"));
        return loadDependency(name);
      },
    }, { filename: file });
    return loadedModule.exports;
  }
  return load(path.resolve("src/features/profile/api.ts"));
}

const json = (body, status = 200) => Response.json(body, { status });
const expired = () => json({ message: "jwt expired" }, 500);

async function check(responses, expectedPaths, expectedError, signOutCount = 0) {
  const calls = [];
  const events = [];
  const signOuts = [];
  const api = loadClient(async (url, options) => {
    calls.push({ url, method: options.method, body: options.body });
    const response = responses.shift();
    assert.ok(response, "Unexpected extra request");
    if (response instanceof Error) throw response;
    return response;
  }, events, signOuts);
  const result = api.saveProfile({ fName: "Test" });
  if (expectedError) await assert.rejects(result, { message: expectedError });
  else assert.equal((await result).message, "done");
  assert.deepEqual(calls.map((call) => call.url), expectedPaths);
  assert.equal(signOuts.length, signOutCount);
  if (calls.length === 3) assert.deepEqual(calls[0], calls[2], "Retry must preserve method and body");
  assert.deepEqual(events, calls.length > 1 ? ["session-renewal-start", "session-renewal-end"] : []);
}

async function main() {
  const profile = "/api/profile";
  const refresh = "/api/auth/refresh";
  await check([expired(), json({ message: "done" }), json({ message: "done" })], [profile, refresh, profile]);
  await check([expired(), json({ message: "done" }), expired()], [profile, refresh, profile], "jwt expired");
  await check([json({ message: "Account blocked" }, 403)], [profile], "Account blocked");
  await check([expired(), json({ message: "Session expired" }, 401)], [profile, refresh], "Session expired", 1);
  await check([expired(), json({ message: "Refresh unavailable" }, 503)], [profile, refresh], "Refresh unavailable");
  await check([expired(), new Error("Network unavailable")], [profile, refresh], "Network unavailable");
  await check([expired(), json({ message: "to many requests" }, 429)], [profile, refresh], "to many requests");
  const backendModule = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync("src/lib/auth-api.server.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, {
    module: backendModule, exports: backendModule.exports, Buffer, AbortSignal,
    console: { log() {} },
    fetch: async () => json({ message: "error", error: "to many requests" }, 429),
    require: (name) => {
      if (name === "server-only") return {};
      if (name === "@/lib/backend-api.server") return { backendUrl: (url) => url };
      return loadDependency(name);
    },
  });
  const failedRenewal = await backendModule.exports.refreshBackendToken({
    accessToken: "old", refreshToken: "refresh", accessTokenExpiresAt: 1,
    refreshTokenExpiresAt: Date.now() + 60_000,
  });
  assert.equal(failedRenewal.error, "RefreshUnavailable");
  assert.equal(failedRenewal.refreshError.message, "to many requests");
  assert.equal(failedRenewal.refreshError.status, 429);
  console.log("PASS: refresh and retry once, preserve request and errors, sign out on expired session, clear loading on failure");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

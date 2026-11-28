import test from "node:test";
import assert from "node:assert/strict";
import { readPublicConfig } from "./config.js";

test("frontend-first mode ignores stale API flags instead of sending requests", () => {
  const expected = { mode: "frontend", api: "", miniAppAPI: "", phoneAccounts: false };
  assert.deepEqual(readPublicConfig(), expected);
  assert.deepEqual(readPublicConfig({ VITE_API_URL: "/api", VITE_GO_PHONE_ACCOUNTS: "true", VITE_ACCOUNT_API_URL: "/api", VITE_BACKEND_PROXY_TARGET: "http://127.0.0.1:38119" }), expected);
});

test("server mode uses the real shared account API and preserves legacy public aliases", () => {
  assert.deepEqual(readPublicConfig({ VITE_APP_MODE: "server" }), { mode: "server", api: "/api", miniAppAPI: "/api", phoneAccounts: true });
  assert.equal(readPublicConfig({ VITE_APP_MODE: "server", VITE_API_URL: "https://api.example.test/api/" }).api, "https://api.example.test/api");
  assert.equal(readPublicConfig({ VITE_APP_MODE: "server", VITE_GO_API_URL: "/api" }).api, "/api");
});

test("server mode refuses credential-bearing/private public URLs and missing account API", () => {
  for (const value of ["//other.test/api", "https://user:secret@example.test/api", "http://public.test/api", "http://backend.railway.internal/api", "https://api.test/api?token=secret"]) {
    assert.throws(() => readPublicConfig({ VITE_APP_MODE: "server", VITE_API_URL: value }));
  }
  assert.throws(() => readPublicConfig({ VITE_APP_MODE: "server", VITE_API_URL: "" }));
  assert.throws(() => readPublicConfig({ VITE_APP_MODE: "server", VITE_API_URL: "", VITE_PHONE_ACCOUNTS: "false" }));
  assert.throws(() => readPublicConfig({ VITE_APP_MODE: "invalid" }));
});

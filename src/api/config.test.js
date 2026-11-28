import test from "node:test";
import assert from "node:assert/strict";
import { readPublicConfig } from "./config.js";

test("frontend defaults to the same-origin Backend instead of local demo data", () => {
  assert.deepEqual(readPublicConfig(), { api: "/api", miniAppAPI: "/api", phoneAccounts: true });
  assert.equal(readPublicConfig({ VITE_API_URL: "https://api.example.test/api/" }).api, "https://api.example.test/api");
  assert.equal(readPublicConfig({ VITE_GO_API_URL: "/api" }).api, "/api");
});

test("frontend refuses credential-bearing/private public URLs and missing phone API", () => {
  for (const value of ["//other.test/api", "https://user:secret@example.test/api", "http://public.test/api", "http://backend.railway.internal/api", "https://api.test/api?token=secret"]) {
    assert.throws(() => readPublicConfig({ VITE_API_URL: value }));
  }
  assert.throws(() => readPublicConfig({ VITE_API_URL: "" }));
  assert.equal(readPublicConfig({ VITE_API_URL: "", VITE_PHONE_ACCOUNTS: "false" }).api, "");
});

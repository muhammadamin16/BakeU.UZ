import test from "node:test";
import assert from "node:assert/strict";
import { setup, fields } from "./helpers.js";
import { createApiServer } from "../services/httpServer.js";

test("Go cutover prevents a second source of identity while preserving legacy owner login", async () => {
  const s = setup();
  const legacy = await s.auth.register(fields());
  const server = createApiServer({ ...s, ordersSettings: { accountsEnabled: true, enabled: false, baseUrl: "https://backend.test", token: "test-bridge" } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const before = s.db.prepare("SELECT count(*) AS n FROM users").get().n;
    for (const [method, path] of [["POST", "/auth/register"], ["POST", "/auth/start-registration"], ["POST", "/auth/verify-registration"], ["POST", "/shop/open"], ["PATCH", "/auth/me"]]) {
      const response = await fetch(base + path, { method, headers: { "content-type": "application/json" }, body: "{}" });
      assert.equal(response.status, 409); assert.equal((await response.json()).code, "GO_ACCOUNTS_REQUIRED");
    }
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM users").get().n, before);
    const response = await fetch(base + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: fields().email, password: fields().password }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).user.id, legacy.user.id);
  } finally { await new Promise((resolve) => server.close(resolve)); s.db.close(); }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readConfig } from "../config/index.js";
import { createApiServer } from "../services/httpServer.js";
import { setup } from "./helpers.js";
const environment = {
  BOT_TOKEN: "123456:synthetic_test_token_1234567890",
  ADMIN_IDS: "12345",
  SITE_URL: "https://bakeu.uz",
};
test("configured native origins are exact; arbitrary custom schemes and null stay rejected", () => {
  const config = readConfig({
    ...environment,
    ALLOWED_ORIGINS: "https://localhost,capacitor://localhost",
  });
  assert.deepEqual(config.origins, [
    "https://localhost",
    "capacitor://localhost",
  ]);
  for (const origin of [
    "capacitor://*",
    "capacitor://localhost/path",
    "capacitor://evil",
    "capacitor://u:p@localhost",
    "null",
    "*",
  ])
    assert.throws(
      () => readConfig({ ...environment, ALLOWED_ORIGINS: origin }),
      undefined,
      origin,
    );
});
test("iOS origin can reach API CORS checks but cannot gain an authenticated session", async () => {
  const { db, repo, auth, config } = setup();
  const server = createApiServer({
    auth,
    repo,
    config: {
      ...config,
      origins: [...config.origins, "capacitor://localhost"],
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    let response = await fetch(url + "/api/auth/me", {
      headers: { Origin: "capacitor://localhost" },
    });
    assert.equal(response.status, 401);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "capacitor://localhost",
    );
    response = await fetch(url + "/api/auth/me", {
      headers: { Origin: "capacitor://evil" },
    });
    assert.equal(response.status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

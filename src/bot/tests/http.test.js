import test from "node:test";
import assert from "node:assert/strict";
import { setup, fields } from "./helpers.js";
import { createApiServer } from "../services/httpServer.js";
test("HTTP API handles CORS, server registration, login, authenticated profile and logout", async () => {
  const s = setup();
  const server = createApiServer(s);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let response = await fetch(base + "/health");
    assert.equal(response.status, 200);
    response = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify(fields()),
    });
    assert.equal(response.status, 403);
    response = await fetch(base + "/api/auth/register", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    response = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: {
        Origin: "http://localhost:5173",
        "content-type": "application/json",
      },
      body: JSON.stringify(fields()),
    });
    assert.equal(response.status, 201);
    const { token, user } = await response.json();
    assert.ok(token);
    assert.ok(!user.password);
    response = await fetch(base + "/api/auth/me");
    assert.equal(response.status, 401);
    const headers = {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
    response = await fetch(base + "/api/auth/me", { headers });
    assert.equal((await response.json()).user.id, user.id);
    response = await fetch(base + "/api/auth/me", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ firstName: "Обновлено" }),
    });
    assert.equal((await response.json()).user.firstName, "Обновлено");
    response = await fetch(base + "/api/auth/logout", {
      method: "POST",
      headers,
    });
    assert.equal(response.status, 200);
    response = await fetch(base + "/api/auth/me", { headers });
    assert.equal(response.status, 401);
    response = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    assert.equal(response.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    s.db.close();
  }
});

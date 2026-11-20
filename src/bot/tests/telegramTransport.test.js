import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApiServer } from "../services/httpServer.js";
import { setup } from "./helpers.js";
import {
  discoverGoApi,
  createGoTransport,
  validateGoBase,
  pinGoAccount,
} from "../../telegramOrders/transport.js";
import { createWebsiteOrdersClient } from "../../telegramOrders/client.js";

test("public bot discovery exposes the Go URL but never the bridge secret", async () => {
  const s = setup();
  const server = createApiServer({
    ...s,
    ordersSettings: {
      enabled: true,
      baseUrl: "https://backend.example",
      token: "never-public",
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const result = await (
      await fetch(
        `http://127.0.0.1:${server.address().port}/api/telegram/config`,
      )
    ).json();
    assert.deepEqual(result, {
      enabled: true,
      apiBase: "https://backend.example/api",
    });
    assert.ok(!JSON.stringify(result).includes("never-public"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    s.db.close();
  }
});
test("discovery rejects missing configuration and insecure backend URLs", async () => {
  assert.throws(() => validateGoBase("http://external.example"));
  assert.throws(() => validateGoBase("https://user:password@backend.example"));
  assert.equal(
    validateGoBase("http://127.0.0.1:8080"),
    "http://127.0.0.1:8080/api",
  );
  await assert.rejects(() =>
    discoverGoApi({
      fetchImpl: async () => new Response(JSON.stringify({ enabled: false })),
    }),
  );
  assert.equal(
    await discoverGoApi({ configured: "https://backend.example/api" }),
    "https://backend.example/api",
  );
});
test("Go transport uses its own in-memory JWT and clears it on logout", async () => {
  const calls = [];
  const transport = createGoTransport("https://backend.example", {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify(
          url.endsWith("/auth/login")
            ? { token: "go-access", user: { uid: "buyer", role: "customer" } }
            : { ok: true },
        ),
      );
    },
  });
  await transport.login("buyer@example.com", "password");
  await transport.request("/orders");
  assert.equal(calls.at(-1).options.headers.Authorization, "Bearer go-access");
  assert.equal(calls.at(-1).options.credentials, "omit");
  await transport.logout();
  await transport.request("/orders");
  assert.equal(calls.at(-1).options.headers.Authorization, undefined);
});
test("multi-shop checkout has one request key and independently validated fulfillment choices", async () => {
  const calls = [];
  const client = createWebsiteOrdersClient(async (path, options) => {
    calls.push({ path, options });
    return path === "/orders/capabilities"
      ? {
          workflowVersion: 2,
          history: true,
          idempotency: true,
          deliveryScheduling: true,
        }
      : {
          orders: [
            { id: "one", status: "pending" },
            { id: "two", status: "pending" },
          ],
        };
  });
  const date = new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 10);
  await client.checkout({
    items: [
      { productId: "p1", qty: 1 },
      { productId: "p2", qty: 2 },
    ],
    requestId: "checkout-once",
    deliveries: {
      shop1: {
        fulfillment: "delivery",
        address: "Tashkent",
        location: { latitude: 0, longitude: 0 },
        date,
        time: "10:00",
      },
      shop2: {
        fulfillment: "pickup",
        address: "private",
        location: { latitude: 41, longitude: 69 },
        date,
        time: "14:00",
      },
    },
  });
  const posted = calls.at(-1).options;
  assert.equal(posted.headers["Idempotency-Key"], "checkout-once");
  assert.equal(posted.body.deliveries.shop2.deliveryAddress, "");
  assert.equal(posted.body.deliveries.shop2.location, null);
  assert.deepEqual(posted.body.deliveries.shop1.location, {
    latitude: 0,
    longitude: 0,
  });
});

test("pinned page refuses reads and writes after a shared Go account switch", async () => {
  const calls = [];
  const transport = {
    request: async (path) => {
      calls.push(path);
      return { uid: "other", role: "customer" };
    },
  };
  const pinned = pinGoAccount(transport, "buyer", "customer");
  await assert.rejects(() => pinned.request("/me"), /Сессия/);
  await assert.rejects(
    () => pinned.request("/orders", { method: "POST", body: {} }),
    /Сессия/,
  );
  assert.deepEqual(calls, ["/me", "/me"]);
});

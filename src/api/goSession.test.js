import assert from "node:assert/strict";
import test from "node:test";
import { createGoSession } from "./goSession.js";

test("restores from a cookie and coalesces concurrent JWT refresh after 401", async () => {
  let rotations = 0;
  let signedOut = false;
  const fetchImpl = async (path, options) => {
    if (path.endsWith("/auth/refresh")) {
      assert.equal(options.credentials, "include");
      assert.equal(options.headers["X-BakeU-Session"], "browser");
      if (signedOut) return Response.json({ error: "expired" }, { status: 401 });
      rotations++;
      return Response.json({ token: `access-${rotations}` });
    }
    if (path.endsWith("/auth/logout")) {
      signedOut = true;
      return new Response(null, { status: 204 });
    }
    assert.equal(options.credentials, "omit");
    if (options.headers.Authorization === "Bearer access-1" && options.method === "PATCH") {
      return Response.json({ error: "expired" }, { status: 401 });
    }
    return Response.json({ name: "Bakery" });
  };
  const api = createGoSession("/api", { fetchImpl });
  assert.equal((await api.request("/market/mine")).name, "Bakery");
  await Promise.all([
    api.request("/market/mine", "PATCH", { name: "Bakery" }),
    api.request("/market/mine", "PATCH", { name: "Bakery" }),
  ]);
  assert.equal(rotations, 2);
  await api.logout();
  await assert.rejects(api.request("/market/mine"), { status: 401 });
});

test("orders client reads Go orders through refresh and honors cancellation", async () => {
  const { createWebsiteOrdersClient } = await import("../telegramOrders/client.js");
  const order = { id: "order", sellerId: "seller", items: [], total: 100 };
  const paths = [];
  const api = createGoSession("/api", {
    fetchImpl: async (path, options) => {
      paths.push(path);
      if (path.endsWith("/auth/refresh")) return Response.json({ token: "go-access" });
      assert.equal(options.headers.Authorization, "Bearer go-access");
      if (path.endsWith("/me")) return Response.json({ uid: "seller", role: "seller" });
      return Response.json({ incoming: [order], placed: [] });
    },
  });
  const client = createWebsiteOrdersClient(api.requestWithOptions);
  const signal = new AbortController();
  assert.deepEqual((await client.load(signal.signal)).orders, [order]);
  assert.deepEqual(paths, ["/api/auth/refresh", "/api/me", "/api/orders"]);
  signal.abort();
  await assert.rejects(client.load(signal.signal), { name: "AbortError" });
  assert.equal(paths.length, 3);
});

test("legacy Go order API stays read-only when Telegram checkout is attempted", async () => {
  const { createWebsiteOrdersClient } = await import("../telegramOrders/client.js");
  const writes = [];
  const api = createGoSession("/api", {
    fetchImpl: async (path, options) => {
      if (path === "/api/auth/refresh") return Response.json({ token: "go-access" });
      assert.equal(options.headers.Authorization, "Bearer go-access");
      if (options.method !== "GET") writes.push(path);
      assert.equal(path, "/api/orders/capabilities");
      return Response.json({ error: "route unavailable" }, { status: 404 });
    },
  });
  const orders = createWebsiteOrdersClient(api.requestWithOptions);
  await assert.rejects(orders.checkout({
    items: [{ productId: "cake", qty: 1 }],
    requestId: "staging-checkout",
  }), { status: 404 });
  await assert.rejects(orders.transition({ id: "order", status: "pending" }, "accepted", "staging-transition"), { status: 404 });
  assert.deepEqual(writes, []);
});

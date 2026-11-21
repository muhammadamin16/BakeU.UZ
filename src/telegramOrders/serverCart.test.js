import { test } from "node:test";
import assert from "node:assert/strict";
import { createServerCart, includesSavedCart, lineKey, restoreCart } from "./serverCart.js";

test("cart sends quantity and variant, and deletes only the selected variant", async () => {
  const calls = [];
  const item = { productId: "cake", variantId: "large", qty: 2 };
  const cart = createServerCart(async (path, options) => {
    calls.push([path, options]);
    return { revision: "r1", items: options.method === "DELETE" ? [] : [item] };
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await cart.load(signal), { revision: "r1", items: [item] });
  assert.deepEqual(await cart.save({ ...item, price: 1 }, "r1"), { revision: "r1", items: [item] });
  await assert.rejects(cart.save({ ...item, qty: 1001 }, "r1"));
  assert.deepEqual(await cart.remove(item, "r1"), { revision: "r1", items: [] });
  assert.deepEqual(calls, [
    ["/cart", { signal }],
    ["/cart/items", { method: "POST", body: { ...item, cartRevision: "r1" } }],
    ["/cart/items/cake?variantId=large&cartRevision=r1", { method: "DELETE" }],
  ]);
});

test("restoring restores two variants and flags unavailable or duplicate lines", () => {
  const selected = { productId: "cake", variantId: "large", qty: 2 };
  const duplicate = { ...selected, variantId: "" };
  const unavailable = { productId: "gone", variantId: "", qty: 1 };
  const restored = restoreCart([selected, duplicate, selected, unavailable], [{ id: "cake", variants: [{ id: "large" }] }]);
  assert.equal(restored.qty[lineKey("cake", "large")], 2);
  assert.equal(restored.qty[lineKey("cake")], 2);
  assert.deepEqual(restored.skipped, [selected, unavailable]);
});

test("checkout refuses to clear saved lines that the purchase does not include", () => {
  const saved = [{ productId: "cake", variantId: "", qty: 2 }];
  assert.equal(includesSavedCart(saved, [{ productId: "cake", qty: 2 }]), true);
  assert.equal(includesSavedCart(saved, [{ productId: "cake", variantId: "large", qty: 2 }]), false);
  assert.equal(includesSavedCart(saved, [{ productId: "cake", qty: 1 }]), false);
});

test("checkout sends both variants and the snapshot revision only on a capable backend", async () => {
  const { createWebsiteOrdersClient } = await import("./client.js");
  const calls = [];
  const capabilities = { workflowVersion: 2, idempotency: true, history: true, deliveryScheduling: true, variantSnapshots: true, cartRevision: false };
  const client = createWebsiteOrdersClient(async (path, options) => {
    if (path === "/orders/capabilities") return capabilities;
    calls.push({ path, options });
    return { orders: [{ id: "saved", status: "pending" }] };
  });
  const date = new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 10);
  const input = {
    items: [{ productId: "cake", variantId: "small", qty: 1 }, { productId: "cake", variantId: "large", qty: 2 }],
    deliveries: { shop: { fulfillment: "pickup", date, time: "12:00" } },
    requestId: "cart-attempt",
    cartRevision: "r1",
  };
  await assert.rejects(client.checkout(input), /безопасное оформление/);
  assert.equal(calls.length, 0);
  capabilities.cartRevision = true;
  await client.checkout(input);
  await client.checkout(input);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[0].options.body.items, input.items);
  assert.equal(calls[0].options.body.cartRevision, "r1");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServerCart, includesSavedCart, restoreCart } from "./serverCart.js";

test("cart sends quantity and variant, and deletes only the selected variant", async () => {
  const calls = [];
  const item = { productId: "cake", variantId: "large", qty: 2 };
  const cart = createServerCart(async (path, options) => {
    calls.push([path, options]);
    return { items: options.method === "DELETE" ? [] : [item] };
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await cart.load(signal), [item]);
  assert.deepEqual(await cart.save({ ...item, price: 1 }), [item]);
  await assert.rejects(cart.save({ ...item, qty: 1001 }));
  assert.deepEqual(await cart.remove(item), []);
  assert.deepEqual(calls, [
    ["/cart", { signal }],
    ["/cart/items", { method: "POST", body: item }],
    ["/cart/items/cake?variantId=large", { method: "DELETE" }],
  ]);
});

test("restoring flags unavailable or duplicate variant lines without silently dropping them", () => {
  const selected = { productId: "cake", variantId: "large", qty: 2 };
  const duplicate = { ...selected, variantId: "" };
  const unavailable = { productId: "gone", variantId: "", qty: 1 };
  const restored = restoreCart([selected, duplicate, unavailable], [{ id: "cake", variants: [{ id: "large" }] }]);
  assert.equal(restored.qty.cake, 2);
  assert.equal(restored.variants.cake, "large");
  assert.deepEqual(restored.skipped, [duplicate, unavailable]);
});

test("checkout refuses to clear saved lines that the purchase does not include", () => {
  const saved = [{ productId: "cake", variantId: "", qty: 2 }];
  assert.equal(includesSavedCart(saved, [{ productId: "cake", qty: 2 }]), true);
  assert.equal(includesSavedCart(saved, [{ productId: "cake", variantId: "large", qty: 2 }]), false);
  assert.equal(includesSavedCart(saved, [{ productId: "cake", qty: 1 }]), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { planGuestImport } from "./guestCart.js";
import { productData } from "../store/productData.js";

test("guest import keeps stable variants, excludes demo IDs and preserves existing server quantities", () => {
  const source = { small: 2, big: 4, demo: 9, oldVariant: 1 };
  const metadata = {
    small: productData({ id: "small", productId: "cake", variantId: "small", price: 900 }),
    big: productData({ id: "big", productId: "cake", variantId: "big", price: 100 }),
    oldVariant: productData({ id: "oldVariant", productId: "cake", variantLabel: "Unknown", price: 100 }),
  };
  const products = [{ id: "cake", available: true, variants: [{ id: "small" }, { id: "big" }] }];
  const existing = [{ productId: "cake", variantId: "small", qty: 8 }];
  assert.deepEqual(planGuestImport(source, metadata, products, existing), {
    lines: [{ productId: "cake", variantId: "big", qty: 4 }],
    skipped: 3,
  });
  assert.equal(source.big, 4);
  assert.equal(existing[0].qty, 8);
});

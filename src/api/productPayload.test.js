import test from "node:test";
import assert from "node:assert/strict";
import { maxProductPrice, productPayload, validateProductImage } from "./productPayload.js";

test("product writes reject prices checkout cannot accept and strip client ownership claims", () => {
  const draft = { title: " Cake ", price: "10000", available: true, sellerId: "other", ratingAvg: 5, deletedAt: null };
  assert.deepEqual(productPayload(draft), { title: "Cake", price: 10000, description: "", category: "", available: true, variants: [] });
  assert.equal(productPayload({ ...draft, price: maxProductPrice }).price, maxProductPrice);
  for (const price of ["", 0, -1, maxProductPrice + 1, "1e30", "NaN", Infinity]) {
    assert.throws(() => productPayload({ ...draft, price }));
    assert.throws(() => productPayload({ ...draft, variants: [{ name: "Small", price }] }));
  }
  assert.throws(() => productPayload({ ...draft, variants: [{ name: "Small", price: 10 }, { name: " small ", price: 20 }] }));
  assert.equal(productPayload({ ...draft, variants: [{ id: "existing", name: " New name ", price: 20000 }] }).variants[0].id, "existing");
});

test("product media refuses oversized, empty and unsupported files before upload", () => {
  for (const file of [null, { size: 0, type: "image/png" }, { size: 5 * 1024 * 1024 + 1, type: "image/png" }, { size: 20, type: "text/html" }]) {
    assert.throws(() => validateProductImage(file));
  }
  for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) validateProductImage({ type, size: 100 });
});

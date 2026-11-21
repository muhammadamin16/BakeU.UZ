import test from "node:test";
import assert from "node:assert/strict";
import { loadGoCatalog, projectGoMapCatalog } from "./goCatalog.js";

test("map loads every public market page without account credentials", async () => {
  const paths = [];
  const result = await loadGoCatalog("/api", { fetchImpl: async (path, options) => {
    paths.push(path);
    assert.equal(options.credentials, "omit"); assert.equal(options.headers, undefined);
    return Response.json(path === "/api/products" ? [{ id: "cake" }] : path.endsWith("after=") ? {items: [{id: "one"}], next: "one"} : {items: [{id: "two"}], next: ""});
  } });
  assert.equal(result.markets.length, 2);
  assert.equal(result.products.length, 1);
  assert.equal(paths.length, 3);
  await assert.rejects(loadGoCatalog("/api", { fetchImpl: async (path) => Response.json(path.endsWith("/products") ? [] : {items: [], next: "loop"}) }), /неверный список/);
});

test("server map joins products to the actual owner and rejects missing or invalid points", () => {
  const result = projectGoMapCatalog({markets: [
    {id: "shop", sellerId: "seller", name: "Bakery", lat: 0, lng: 0},
    {id: "missing", sellerId: "other", name: "No point"},
    {id: "bad", sellerId: "bad", name: "Bad", lat: 91, lng: 0},
  ], products: [
    {id: "cake", sellerId: "seller", title: "Cake", price: 100, available: true},
    {id: "unavailable", sellerId: "seller", title: "No", price: 100, available: false},
    {id: "foreign", sellerId: "other", title: "No", price: 100, available: true},
  ]});
  assert.equal(result.sellers.length, 1);assert.equal(result.products.length, 1);
  assert.equal(result.products[0].shopId, "shop");assert.equal(result.products[0].lat, 0);
  assert.equal(result.products[0].rating, 0);
});

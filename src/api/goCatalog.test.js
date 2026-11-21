import test from "node:test";
import assert from "node:assert/strict";
import { loadGoCatalog, projectGoMapCatalog } from "./goCatalog.js";

test("map loads every public market page without account credentials", async () => {
  const paths = [];
  const result = await loadGoCatalog("/api", { fetchImpl: async (path, options) => {
    paths.push(path);
    assert.equal(options.credentials, "omit"); assert.equal(options.headers, undefined);
    return Response.json(path.startsWith("/api/products?") ? [{ id: "cake" }] : path.endsWith("after=") ? {items: [{id: "one"}], next: "one"} : {items: [{id: "two"}], next: ""});
  } });
  assert.equal(result.markets.length, 2);
  assert.equal(result.products.length, 1);
  assert.equal(paths.length, 3);
  await assert.rejects(loadGoCatalog("/api", { fetchImpl: async (path) => Response.json(path.endsWith("/products") ? [] : {items: [], next: "loop"}) }), /неверный каталог/);
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

test("public projection never adds demo products or orphaned sellers", async () => {
  const { projectGoCatalog } = await import("./goCatalog.js");
  assert.deepEqual(projectGoCatalog({ markets: [], products: [] }), { shops: [], products: [] });
  const result = projectGoCatalog({
    markets: [{ id: "shop", sellerId: "owner", name: "Bakery" }],
    products: [
      { id: "one", sellerId: "owner", title: "Cake", price: 1000, available: true },
      { id: "two", sellerId: "missing", title: "Bread", price: 1000, available: true },
      { id: "three", sellerId: "owner", title: "Pie", price: 1000, available: false },
    ],
  });
  assert.equal(result.shops[0].server, true);
  assert.deepEqual(result.products.map(({ id, name, shopId }) => [id, name, shopId]), [["one", "Cake", "shop"]]);
});

test("public loader follows product cursors and keeps the approved empty catalog", async () => {
  const result = await loadGoCatalog("/api", { fetchImpl: async (path) => {
    if (path.startsWith("/api/markets?")) return Response.json({ items: [], next: "" });
    return Response.json(path.endsWith("after=")
      ? { items: [{ id: "one" }], next: "one" }
      : { items: [{ id: "two" }], next: "" });
  } });
  assert.deepEqual(result, { markets: [], products: [{ id: "one" }, { id: "two" }] });
});

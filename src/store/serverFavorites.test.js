import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers";
import { createFavoritesController } from "./serverFavorites.js";

test("favorites persist on server with pinned owner; account switch cannot write", async () => {
  let uid = "alice", products = [], latest, writes = 0;
  const guest = { read: () => ({ guest: { id: "guest" } }), change: () => { throw Error("must not use guest"); } };
  const controller = createFavoritesController({ guest, publish: (state) => { latest = state; }, request: async (path, options = {}) => {
    if (path === "/me") return { uid };
    assert.equal(options.headers["X-BakeU-Account"], "alice");
    if (options.method === "PUT") { products = ["cake"]; writes++; }
    return { uid, productIds: products, revision: "r1" };
  } });
  await controller.load(); await controller.change("cake", false); await controller.load();
  assert.equal(latest.items.cake.id, "cake"); assert.equal(writes, 1);
  uid = "bob";
  await assert.rejects(controller.change("cake", true), /Аккаунт изменился/);
  assert.deepEqual(latest.items, {}); assert.equal(writes, 1);
});
test("outage does not silently use guest favorites; expired owner cache is cleared", async () => {
  let status = 503, state;
  const controller = createFavoritesController({ guest: { read() { throw Error("no fallback on outage"); } }, publish: (s) => { state = s; }, request: async (path) => {
    if (status) throw Object.assign(Error("unavailable"), { status });
    return path === "/me" ? { uid: "alice" } : { uid: "alice", productIds: ["cake"], revision: "r1" };
  } });
  await assert.rejects(controller.load(), { status: 503 });
  status = 0; await controller.load(); assert.ok(state.items.cake);
  status = 401; await assert.rejects(controller.load(), { status: 401 }); assert.deepEqual(state.items, {});
});
test("clear supplies revision and delayed response cannot restore a previous account", async () => {
  let done, state;
  const controller = createFavoritesController({ publish: (s) => { state = s; }, request: async (path, options = {}) => {
    if (path === "/me") return { uid: "alice" };
    if (options.method) { assert.equal(path, "/favorites?revision=r1"); return new Promise((resolve) => { done = resolve; }); }
    return { uid: "alice", productIds: ["cake"], revision: "r1" };
  } });
  await controller.load(); const pending = controller.change("", true, true);
  await new Promise(setImmediate); controller.reset({ uid: "bob" });
  done({ uid: "alice", productIds: ["cake"], revision: "r2" }); await pending;
  assert.deepEqual(state.items, {});
});

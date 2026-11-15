import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeAdminState,
  normalizeAccounts,
  removeAdminRecord,
  upsertAdminRecord,
} from "./accounts.js";

const legacy = () => ({
  customers: [
    { id: "U1", name: "Дильноза", notes: "Сохранённая заметка" },
    { id: "U2", name: "Умид" },
  ],
  shops: [
    {
      id: "S1",
      name: "Сладкий дом",
      owner: "Алия",
      phone: "+998 90 111 22 33",
      status: "Открыт",
    },
  ],
  orders: [
    { id: "O1", customer: "Дильноза", shop: "Сладкий дом", total: 180000 },
  ],
  products: [{ id: "P1", name: "Торт", shop: "Сладкий дом" }],
  subscriptions: [{ id: "B1", shop: "Сладкий дом", name: "Алия" }],
  settings: { name: "Мой администратор" },
});

test("old snapshots retain their data and receive stable account relationships", () => {
  const original = legacy();
  const before = structuredClone(original);
  const next = normalizeAccounts(original);
  assert.deepEqual(original, before);
  assert.equal(next.sellers.length, 1);
  assert.equal(next.shops[0].sellerId, next.sellers[0].id);
  assert.equal(next.orders[0].customerId, "U1");
  assert.equal(next.orders[0].shopId, "S1");
  assert.equal(next.products[0].shopId, "S1");
  assert.equal(next.subscriptions[0].sellerId, next.sellers[0].id);
  assert.equal(next.customers[0].notes, "Сохранённая заметка");
  assert.deepEqual(normalizeAccounts(next), next);
});

test("multiple shops with the same owner and phone share a seller account", () => {
  const state = legacy();
  state.shops.push({
    ...state.shops[0],
    id: "S2",
    name: "Второй магазин",
    phone: "998901112233",
  });
  const next = normalizeAccounts(state);
  assert.equal(next.sellers.length, 1);
  assert.equal(next.shops[0].sellerId, next.shops[1].sellerId);
});

test("rehydration does not resurrect deleted demo records or seed sellers", () => {
  const current = normalizeAccounts(legacy());
  const persisted = {
    ...legacy(),
    customers: [],
    shops: [],
    orders: [],
    products: [],
    subscriptions: [],
  };
  const next = mergeAdminState(persisted, current);
  assert.deepEqual(next.sellers, []);
  assert.deepEqual(next.customers, []);
  assert.deepEqual(next.shops, []);
  assert.equal(next.settings.name, persisted.settings.name);
});

test("customer renaming keeps orders attached to the ID, even with duplicate names", () => {
  let state = normalizeAccounts(legacy());
  state = upsertAdminRecord(state, "customers", { id: "U1", name: "Умид" });
  assert.equal(state.orders[0].customerId, "U1");
  assert.equal(state.orders[0].customer, "Умид");
  assert.equal(state.customers[0].notes, "Сохранённая заметка");
  assert.equal(state.customers.filter((row) => row.name === "Умид").length, 2);
});

test("ambiguous legacy names are not assigned to an arbitrary account", () => {
  const state = legacy();
  state.customers.push({ id: "U3", name: "Дильноза" });
  assert.equal(normalizeAccounts(state).orders[0].customerId, undefined);
});

test("seller and shop renaming preserve all linked records", () => {
  let state = normalizeAccounts(legacy());
  const sellerId = state.sellers[0].id;
  state = upsertAdminRecord(state, "sellers", {
    id: sellerId,
    name: "Алия Каримова",
    notes: "Проверена",
  });
  assert.equal(state.shops[0].owner, "Алия Каримова");
  assert.equal(state.subscriptions[0].name, "Алия Каримова");
  state = upsertAdminRecord(state, "shops", {
    ...state.shops[0],
    name: "Новое название",
  });
  for (const collection of ["orders", "products", "subscriptions"]) {
    assert.equal(state[collection][0].shopId, "S1");
    assert.equal(state[collection][0].shop, "Новое название");
  }
  assert.equal(state.shops[0].sellerId, sellerId);
});

test("reassigning a shop moves its subscription to the selected seller", () => {
  let state = normalizeAccounts(legacy());
  state = upsertAdminRecord(state, "sellers", {
    id: "V2",
    name: "Новый продавец",
    phone: "998901234567",
  });
  state = upsertAdminRecord(state, "shops", {
    ...state.shops[0],
    sellerId: "V2",
  });
  assert.equal(state.shops[0].owner, "Новый продавец");
  assert.equal(state.subscriptions[0].sellerId, "V2");
  assert.equal(state.subscriptions[0].name, "Новый продавец");
});

test("changing a name in a legacy order form relinks the account deliberately", () => {
  let state = normalizeAccounts(legacy());
  state = upsertAdminRecord(state, "orders", {
    ...state.orders[0],
    customer: "Умид",
  });
  assert.equal(state.orders[0].customerId, "U2");
});

test("a seller owning shops cannot be deleted; an unlinked seller can", () => {
  let state = normalizeAccounts(legacy());
  assert.equal(removeAdminRecord(state, "sellers", state.sellers[0].id), state);
  state = upsertAdminRecord(state, "sellers", {
    id: "V2",
    name: "Без магазина",
  });
  assert.equal(
    removeAdminRecord(state, "sellers", "V2").sellers.some(
      (row) => row.id === "V2",
    ),
    false,
  );
});

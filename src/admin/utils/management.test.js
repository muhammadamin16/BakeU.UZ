import test from "node:test";
import assert from "node:assert/strict";
import {
  changeAccountStatus,
  changeSubscription,
  decideApplication,
  deleteRestriction,
  historyFor,
  matchesSearch,
  normalizeManagement,
  removeManagedRecord,
  saveManagedRecord,
  scopeRecords,
  shopRestriction,
} from "./management.js";
import {
  pauseSubscriptionRecord,
  resumeSubscriptionRecord,
  subscriptionStatus,
} from "./subscriptions.js";
import { safeProductImage } from "./images.js";

const now = Date.parse("2026-11-16T10:00:00Z");
const expiry = "2026-12-15T18:59:59.999Z";
const initial = () =>
  normalizeManagement(
    {
      customers: [
        { id: "C1", name: "Одинаковое имя", status: "Активен" },
        { id: "C2", name: "Одинаковое имя", status: "Активен" },
      ],
      sellers: [
        { id: "V1", name: "Алия", status: "Активен" },
        { id: "V2", name: "Нодира", status: "Активен" },
      ],
      shops: [
        {
          id: "S1",
          name: "Магазин",
          owner: "Алия",
          sellerId: "V1",
          status: "Открыт",
          plan: "BakeU Pro",
        },
        {
          id: "S2",
          name: "Второй",
          owner: "Нодира",
          sellerId: "V2",
          status: "Открыт",
          plan: "BakeU Pro",
        },
      ],
      products: [
        {
          id: "P1",
          name: "Торт",
          shopId: "S1",
          price: 100,
          status: "Опубликован",
          image: "/images/products/cake.jpg",
        },
        {
          id: "P2",
          name: "Самса",
          shopId: "S2",
          price: 20,
          status: "Опубликован",
        },
      ],
      orders: [
        {
          id: "O1",
          customer: "Одинаковое имя",
          customerId: "C1",
          shopId: "S1",
          total: 100,
          status: "Новый",
          items: [
            {
              productId: "P1",
              name: "Торт",
              shopId: "S1",
              image: "/images/products/cake.jpg",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
      ],
      subscriptions: [
        {
          id: "B1",
          shopId: "S1",
          sellerId: "V1",
          paid: 99000,
          plan: "BakeU Pro",
          until: "2026-12-15",
          expiresAt: expiry,
          status: "Активна",
        },
        {
          id: "B2",
          shopId: "S2",
          sellerId: "V2",
          paid: 99000,
          plan: "BakeU Pro",
          until: "2026-12-15",
          expiresAt: expiry,
          status: "Активна",
        },
      ],
      applications: [
        {
          id: "A1",
          name: "Новый продавец",
          shop: "Новый магазин",
          phone: "998901234567",
          status: "На проверке",
        },
      ],
      notifications: [],
      settings: { name: "Администратор" },
      history: [],
    },
    now,
  );
const line = { productId: "P1", quantity: 2, unitPrice: 0 };
const newOrder = () => ({
  id: "O2",
  shopId: "S1",
  customerId: "C1",
  status: "Новый",
  date: "2026-11-16",
  items: [line],
  total: 1,
});

test("profile filters use IDs, not matching names or text fragments", () => {
  const state = initial();
  assert.deepEqual(
    scopeRecords(state, "products", { sellerId: "V1" }).map((row) => row.id),
    ["P1"],
  );
  assert.equal(scopeRecords(state, "orders", { customerId: "C2" }).length, 0);
  assert.equal(
    scopeRecords(state, "shops", new URLSearchParams("sellerId=missing"))
      .length,
    0,
  );
});

test("a pause preserves exact remaining time and resume shifts expiry by the pause duration", () => {
  const state = initial();
  const paused = changeSubscription(state, "B1", "pause", "Отпуск", now);
  const before = state.subscriptions[0],
    pause = paused.subscriptions[0];
  assert.equal(pause.remainingMs, Date.parse(expiry) - now);
  const duration = 3 * 86400000 + 7000;
  const resumed = changeSubscription(
    paused,
    "B1",
    "resume",
    "",
    now + duration,
  );
  assert.equal(
    Date.parse(resumed.subscriptions[0].expiresAt),
    Date.parse(expiry) + duration,
  );
  assert.equal(resumed.subscriptions[0].paid, before.paid);
  assert.equal(resumed.history.length, 2);
  assert.equal(resumed.history[0].subscriptionId, "B1");
  assert.equal(state.history.length, 0);
});

test("repeated pause/resume commands are idempotent and do not duplicate history", () => {
  const paused = changeSubscription(initial(), "B1", "pause", "Пауза", now);
  assert.equal(
    changeSubscription(paused, "B1", "pause", "Пауза", now + 1000),
    paused,
  );
  const resumed = changeSubscription(paused, "B1", "resume", "", now + 2000);
  assert.equal(
    changeSubscription(resumed, "B1", "resume", "", now + 3000),
    resumed,
  );
});

test("expired or malformed pauses cannot fabricate remaining entitlement", () => {
  assert.throws(
    () => pauseSubscriptionRecord({ until: "2020-01-01" }, now),
    /Истёкшую/,
  );
  assert.throws(
    () =>
      resumeSubscriptionRecord(
        { status: "Приостановлена", remainingMs: 0 },
        now,
      ),
    /Остаток/,
  );
  assert.equal(
    subscriptionStatus({ until: "2020-01-01", status: "Активна" }, now),
    "Истекла",
  );
  assert.equal(
    subscriptionStatus(
      { expiresAt: new Date(now + 2 * 86400000).toISOString() },
      now,
    ),
    "Скоро истекает",
  );
});

test("freezing a seller pauses active plans and thaw restores only automatic pauses", () => {
  const state = initial();
  state.subscriptions.push({
    ...state.subscriptions[0],
    id: "B3",
    status: "Приостановлена",
    remainingMs: 86400000,
    pauseReason: "manual",
  });
  const frozen = changeAccountStatus(
    state,
    "sellers",
    "V1",
    "Заморожен",
    "Проверка",
    now,
  );
  assert.equal(frozen.sellers[0].status, "Заморожен");
  assert.equal(frozen.subscriptions[0].pauseReason, "account:V1");
  assert.throws(
    () => changeSubscription(frozen, "B1", "resume", "", now),
    /разморозьте/,
  );
  assert.match(shopRestriction(frozen, "S1", now), /заморожен/);
  const thawed = changeAccountStatus(
    frozen,
    "sellers",
    "V1",
    "Активен",
    "Проверено",
    now + 86400000,
  );
  assert.equal(
    thawed.subscriptions.find((row) => row.id === "B1").status,
    "Активна",
  );
  assert.equal(
    thawed.subscriptions.find((row) => row.id === "B3").status,
    "Приостановлена",
  );
  assert.equal(
    changeAccountStatus(thawed, "sellers", "V1", "Активен", "", now),
    thawed,
  );
  assert.ok(historyFor(thawed, { sellerId: "V1" }).length >= 4);
});

test("old blocked profiles are upgraded to paused entitlement without clearing data", () => {
  const state = initial();
  state.sellers[0].status = "Заблокирован";
  const next = normalizeManagement(state, now);
  assert.equal(next.subscriptions[0].status, "Приостановлена");
  assert.equal(next.subscriptions[0].pauseReason, "account:V1");
  assert.equal(next.orders.length, 1);
  assert.deepEqual(normalizeManagement(next, now), next);
});

test("new order totals and snapshots come from the catalog, not caller supplied prices", () => {
  const state = saveManagedRecord(initial(), "orders", newOrder(), now);
  const order = state.orders.find((row) => row.id === "O2");
  assert.equal(order.total, 200);
  assert.equal(order.items[0].unitPrice, 100);
  assert.equal(order.items[0].name, "Торт");
  assert.equal(order.items[0].image, "/images/products/cake.jpg");
  assert.equal(order.sellerId, "V1");
  assert.equal(state.history[0].customerId, "C1");
});

test("frozen customers, hidden products and wrong-shop items cannot create orders", () => {
  const frozen = changeAccountStatus(
    initial(),
    "customers",
    "C1",
    "Заморожен",
    "Проверка",
    now,
  );
  assert.throws(
    () => saveManagedRecord(frozen, "orders", newOrder(), now),
    /покупателя заморожен/,
  );
  const hidden = initial();
  hidden.products[0].status = "Скрыт";
  assert.throws(
    () => saveManagedRecord(hidden, "orders", newOrder(), now),
    /Товар недоступен/,
  );
  assert.throws(
    () =>
      saveManagedRecord(
        initial(),
        "orders",
        { ...newOrder(), items: [{ productId: "P2", quantity: 1 }] },
        now,
      ),
    /Товар недоступен/,
  );
  assert.throws(
    () =>
      saveManagedRecord(initial(), "orders", { ...newOrder(), items: [] }, now),
    /Добавьте товары/,
  );
  assert.throws(
    () =>
      saveManagedRecord(
        initial(),
        "orders",
        { ...newOrder(), items: [line, line] },
        now,
      ),
    /дважды/,
  );
  assert.throws(
    () =>
      saveManagedRecord(
        initial(),
        "orders",
        { ...newOrder(), items: [{ ...line, quantity: -1 }] },
        now,
      ),
    /количество/,
  );
});

test("paused Pro access blocks new publication and orders, while retaining existing data", () => {
  const state = changeSubscription(initial(), "B1", "pause", "Пауза", now);
  assert.throws(
    () =>
      saveManagedRecord(
        state,
        "products",
        {
          id: "P3",
          name: "Новый",
          shopId: "S1",
          price: 100,
          status: "Опубликован",
        },
        now,
      ),
    /подписки/,
  );
  assert.throws(
    () => saveManagedRecord(state, "orders", newOrder(), now),
    /подписки/,
  );
  const edited = saveManagedRecord(
    state,
    "products",
    { id: "P1", description: "Исправленное описание" },
    now,
  );
  assert.equal(edited.products[0].description, "Исправленное описание");
  assert.equal(edited.products[0].status, "Опубликован");
});

test("existing paid work can be completed, but terminal orders cannot be rewritten", () => {
  let state = changeAccountStatus(
    initial(),
    "customers",
    "C1",
    "Заморожен",
    "Проверка",
    now,
  );
  state = saveManagedRecord(
    state,
    "orders",
    { id: "O1", status: "В работе" },
    now,
  );
  state = saveManagedRecord(
    state,
    "orders",
    { id: "O1", status: "Доставлен" },
    now + 1000,
  );
  assert.equal(state.orders[0].status, "Доставлен");
  assert.throws(
    () =>
      saveManagedRecord(state, "orders", { id: "O1", status: "Новый" }, now),
    /Недопустимый/,
  );
  assert.throws(
    () => saveManagedRecord(state, "orders", { id: "O1", total: 1 }, now),
    /завершённого/,
  );
  state = saveManagedRecord(
    state,
    "orders",
    { id: "O1", notes: "Доставлено вовремя" },
    now + 2000,
  );
  assert.equal(state.orders[0].notes, "Доставлено вовремя");
});

test("historical order snapshots survive a deleted product and catalog price changes", () => {
  const state = initial();
  state.products = [];
  const next = saveManagedRecord(
    state,
    "orders",
    { id: "O1", status: "В работе" },
    now,
  );
  assert.equal(next.orders[0].items[0].name, "Торт");
  assert.equal(next.orders[0].total, 100);
  const changed = initial();
  changed.products[0].price = 999;
  assert.equal(
    saveManagedRecord(changed, "orders", { id: "O1", notes: "Проверено" }, now)
      .orders[0].total,
    100,
  );
});

test("edits and deletes are audited without logging images or credential material", () => {
  let state = initial();
  state = saveManagedRecord(
    state,
    "products",
    { id: "P1", image: "data:image/png;base64,AAAA" },
    now,
  );
  assert.ok(!JSON.stringify(state.history).includes("base64"));
  state = saveManagedRecord(
    state,
    "customers",
    { id: "C1", notes: "Проверен", password: "not-a-real-password" },
    now,
  );
  assert.equal(state.customers[0].password, undefined);
  assert.ok(!JSON.stringify(state.history).includes("not-a-real-password"));
  const length = state.history.length;
  assert.equal(
    saveManagedRecord(state, "customers", { id: "C1", notes: "Проверен" }, now)
      .history.length,
    length,
  );
  assert.match(
    deleteRestriction(state, "customers", state.customers[0]),
    /заказы/,
  );
  assert.throws(
    () => removeManagedRecord(state, "sellers", "V1", now),
    /связанные/,
  );
  state = removeManagedRecord(state, "products", "P2", now);
  assert.equal(state.history[0].action, "Запись удалена");
  assert.equal(state.history[0].productId, "P2");
});

test("approval is idempotent and appears in the new seller's history", () => {
  const state = decideApplication(initial(), "A1", "Одобрено", now);
  assert.equal(state.shops.length, 3);
  const shop = state.shops.find((row) => row.id === "shop-A1");
  assert.equal(historyFor(state, { sellerId: shop.sellerId }).length, 1);
  assert.equal(decideApplication(state, "A1", "Одобрено", now), state);
});

test("photo migration is conservative and unsafe image schemes are rejected", () => {
  const state = initial();
  state.products.push({
    id: "P101",
    name: "Шоколадный торт",
    shopId: "S1",
    price: 100,
    status: "На проверке",
  });
  assert.equal(
    normalizeManagement(state, now).products.at(-1).image,
    "/images/products/cake.jpg",
  );
  state.products.at(-1).image = "";
  assert.equal(normalizeManagement(state, now).products.at(-1).image, "");
  for (const value of [
    "javascript:alert(1)",
    "data:image/svg+xml;base64,AAA",
    "//unknown.test/image",
  ])
    assert.equal(safeProductImage(value), "");
  assert.equal(
    safeProductImage("/images/products/cake.jpg"),
    "/images/products/cake.jpg",
  );
  assert.equal(
    matchesSearch(
      { image: "data:image/png;base64,AAAA", name: "Торт" },
      "base64",
    ),
    false,
  );
});

test("shop reassignment preserves the historical seller on existing orders", () => {
  let state = initial();
  state = saveManagedRecord(state, "shops", { id: "S1", sellerId: "V2" }, now);
  assert.equal(state.products.find((row) => row.id === "P1").sellerId, "V2");
  assert.equal(state.orders[0].sellerId, "V1");
  state = saveManagedRecord(
    state,
    "orders",
    { id: "O1", notes: "Проверено" },
    now,
  );
  assert.equal(state.orders[0].sellerId, "V1");
  assert.deepEqual(
    scopeRecords(state, "orders", { sellerId: "V1" }).map((row) => row.id),
    ["O1"],
  );
});

test("orders cannot be emptied or expanded for a frozen account", () => {
  assert.throws(
    () =>
      saveManagedRecord(
        initial(),
        "orders",
        { id: "O1", items: [], total: 0 },
        now,
      ),
    /не может быть пустым/,
  );
  const frozen = changeAccountStatus(
    initial(),
    "customers",
    "C1",
    "Заморожен",
    "Проверка",
    now,
  );
  assert.throws(
    () => saveManagedRecord(frozen, "orders", { id: "O1", items: [line] }, now),
    /покупателя заморожен/,
  );
  assert.equal(
    saveManagedRecord(frozen, "orders", { id: "O1", status: "В работе" }, now)
      .orders[0].status,
    "В работе",
  );
});

test("subscription renewal requires a future date while notes on expired plans remain editable", () => {
  const state = initial();
  assert.throws(
    () =>
      saveManagedRecord(
        state,
        "subscriptions",
        { id: "B1", until: "2020-01-01" },
        now,
      ),
    /в будущем/,
  );
  state.subscriptions[0].until = "2020-01-01";
  delete state.subscriptions[0].expiresAt;
  state.subscriptions[0].status = "Истекла";
  assert.equal(
    saveManagedRecord(
      state,
      "subscriptions",
      { id: "B1", notes: "Связаться" },
      now,
    ).subscriptions[0].notes,
    "Связаться",
  );
});

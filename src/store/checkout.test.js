import test from "node:test";
import assert from "node:assert/strict";
import {
  checkoutGroups,
  contactPhone,
  emptySchedule,
  groupSignature,
  orderMessage,
  prepareCheckout,
  smsLink,
} from "./checkout.js";
import { authReturnTo, authLink } from "./navigation.js";

const now = new Date("2026-11-15T08:00:00").getTime();
const shops = ["shahzoda", "sweet-home", "bakeu"].map((id) => ({
  id,
  name: id,
  phone: "+998 90 123 45 67",
  address: "Ташкент, улица 1",
}));
const catalog = [
  {
    id: "cake",
    name: "Торт",
    shopId: "shahzoda",
    price: 45000,
    image: "/cake.jpg",
  },
  { id: "cookie", name: "Печенье", shopId: "sweet-home", price: 13200 },
  { id: "bread", name: "Хлеб", shopId: "bakeu", price: 3400 },
  { id: "somsa", name: "Самса", shopId: "bakeu", price: 7000 },
];
const cart = {
  items: { "cake::large": 3, cookie: 1, bread: 4, somsa: 2 },
  products: { "cake::large": { productId: "cake", price: 1, shopId: "wrong" } },
};
function input() {
  const sellers = {};
  for (const group of checkoutGroups(cart, catalog, shops).groups) {
    const slot = { ...emptySchedule(), date: "2026-11-17", time: "14:30" };
    sellers[group.shop.id] = {
      ...slot,
      agreedFor: groupSignature(group, slot),
    };
  }
  return {
    account: { id: "buyer", role: "client" },
    buyerId: "buyer",
    cart: structuredClone(cart),
    catalog,
    shops,
    checkoutId: "checkout-test-12345",
    now,
    details: {
      name: "Покупатель",
      phone: "+998 (90) 123-45-67",
      address: "Ташкент, дом 17",
      sellers,
    },
  };
}
const state = () => ({ orders: [], threads: [] });

test("three sellers share one checkout while bread and somsa stay in one seller order", () => {
  const result = prepareCheckout(state(), input());
  assert.equal(result.orders.length, 3);
  assert.equal(new Set(result.orders.map((o) => o.checkoutId)).size, 1);
  assert.equal(
    result.orders.reduce((n, o) => n + o.total, 0),
    310800,
  );
  assert.equal(result.orders.find((o) => o.shopId === "bakeu").items.length, 2);
  assert.equal(result.orders[0].buyerPhone, "+998901234567");
});

test("checkout uses current catalog prices, variants and seller IDs instead of stale cart fields", () => {
  const { groups, issues } = checkoutGroups(cart, catalog, shops);
  assert.equal(issues.length, 0);
  assert.equal(groups[0].items[0].price, 90000);
  assert.equal(groups[0].items[0].variantLabel, "2 кг · 12–16 порций");
  assert.equal(groups[0].items[0].shopId, "shahzoda");
  assert.equal(groups[0].priceChanged, true);
});

test("missing products, shops, variants, hidden products and invalid quantities block checkout", () => {
  for (const change of [
    (i) => {
      delete i.cart.products["cake::large"];
      i.cart.items["cake::missing"] = 1;
    },
    (i) => {
      i.cart.items.bread = 0;
    },
    (i) => {
      i.cart.items.bread = 1.5;
    },
    (i) => {
      i.catalog = catalog.map((p) =>
        p.id === "bread" ? { ...p, price: Infinity } : p,
      );
    },
    (i) => {
      i.catalog = catalog.map((p) =>
        p.id === "bread" ? { ...p, price: 10000000000 } : p,
      );
      i.cart.items.bread = 9999;
    },
    (i) => {
      i.catalog = catalog.filter((p) => p.id !== "bread");
    },
    (i) => {
      i.shops = shops.slice(0, 2);
    },
    (i) => {
      i.catalog = catalog.map((p) =>
        p.id === "bread" ? { ...p, available: false } : p,
      );
    },
  ]) {
    const i = input();
    change(i);
    assert.throws(() => prepareCheckout(state(), i), /недоступные/);
  }
});

test("legacy cart items without seller metadata resolve through the catalog", () => {
  const { groups } = checkoutGroups(
    { items: { cake: 1 }, products: { cake: { name: "Old", price: 45000 } } },
    catalog,
    shops,
  );
  assert.equal(groups[0].shop.id, "shahzoda");
  assert.equal(groups[0].items[0].productId, "cake");
});

test("a buyer must agree separately with every seller, and changing a slot or quantity invalidates agreement", () => {
  for (const change of [
    (i) => {
      i.details.sellers.bakeu.agreedFor = "";
    },
    (i) => {
      i.details.sellers.bakeu.time = "15:00";
    },
    (i) => {
      i.details.sellers.bakeu.method = "delivery";
    },
    (i) => {
      i.cart.items.bread++;
    },
  ]) {
    const i = input();
    change(i);
    assert.throws(() => prepareCheckout(state(), i), /Согласуйте/);
  }
});

test("phone, identity, future date and delivery address are validated before any order is committed", () => {
  for (const [change, pattern] of [
    [
      (i) => {
        i.details.phone = "123";
      },
      /телефон/,
    ],
    [
      (i) => {
        i.details.name = " ";
      },
      /имя/,
    ],
    [
      (i) => {
        i.details.sellers.bakeu.date = "2020-01-01";
      },
      /будущую/,
    ],
    [
      (i) => {
        i.details.sellers.bakeu.date = "2026-02-30";
      },
      /будущую/,
    ],
    [
      (i) => {
        i.account = null;
      },
      /Войдите/,
    ],
  ]) {
    const i = input();
    change(i);
    const before = state();
    assert.throws(() => prepareCheckout(before, i), pattern);
    assert.equal(before.orders.length, 0);
    assert.equal(before.threads.length, 0);
  }
  const i = input(),
    group = checkoutGroups(cart, catalog, shops).groups.find(
      (g) => g.shop.id === "bakeu",
    );
  i.details.sellers.bakeu.method = "delivery";
  i.details.sellers.bakeu.agreedFor = groupSignature(
    group,
    i.details.sellers.bakeu,
  );
  i.details.address = "";
  assert.throws(() => prepareCheckout(state(), i), /полный адрес/);
});

test("seller buyers can buy elsewhere but cannot order from their own store", () => {
  const i = input();
  i.account.role = "seller";
  i.ownShopId = "own-other";
  assert.equal(prepareCheckout(state(), i).orders.length, 3);
  i.ownShopId = "bakeu";
  assert.throws(() => prepareCheckout(state(), i), /собственном/);
});

test("each seller receives a separate local conversation with only its own items", () => {
  const before = state();
  before.threads.push({
    id: "old",
    buyerId: "buyer",
    shopId: "bakeu",
    messages: [{ text: "Здравствуйте" }],
  });
  const result = prepareCheckout(before, input());
  assert.equal(result.threads.length, 3);
  assert.equal(before.threads[0].messages.length, 1);
  const bread = result.threads.find((t) => t.shopId === "bakeu");
  assert.equal(bread.id, "old");
  assert.equal(bread.messages.length, 2);
  assert.ok(bread.messages[1].text.includes("Хлеб"));
  assert.ok(!bread.messages[1].text.includes("Торт"));
  assert.equal(result.orders[0].history[0].status, "Новый");
});

test("repeating a checkout ID cannot duplicate orders or messages, or reveal another buyer's orders", () => {
  const i = input(),
    result = prepareCheckout(state(), i);
  const again = prepareCheckout(
    { orders: result.orders, threads: result.threads },
    i,
  );
  assert.equal(again.repeated, true);
  assert.deepEqual(again.orders, result.orders);
  assert.equal(
    again.threads.reduce((n, t) => n + t.messages.length, 0),
    3,
  );
  i.buyerId = "someone-else";
  assert.throws(
    () =>
      prepareCheckout({ orders: result.orders, threads: result.threads }, i),
    /недоступна/,
  );
});

test("SMS is an encoded compose link for the correct seller, including iPhone separators", () => {
  const order = prepareCheckout(state(), input()).orders[0],
    text = orderMessage(order);
  assert.ok(text.includes("270 000") || text.includes("270 000"));
  assert.ok(text.includes("17.11.2026 в 14:30"));
  assert.equal(
    smsLink(order.shopPhone, text),
    "sms:+998901234567?body=" + encodeURIComponent(text),
  );
  assert.ok(
    smsLink(order.shopPhone, text, true).startsWith("sms:+998901234567&body="),
  );
  assert.equal(smsLink("invalid", text), "");
  assert.equal(contactPhone("901234567"), "+998901234567");
});

test("login and registration return only to safe internal purchase routes", () => {
  assert.equal(
    authReturnTo(new URLSearchParams("next=%2Fcheckout")),
    "/checkout",
  );
  assert.equal(
    authLink("/register", new URLSearchParams("next=%2Forders%2F123")),
    "/register?next=%2Forders%2F123",
  );
  for (const next of [
    "//evil.test",
    "/checkout\\evil.test",
    "https://evil.test",
    "/login",
    "/checkout\n",
  ])
    assert.equal(authReturnTo(new URLSearchParams({ next })), "/profile");
});

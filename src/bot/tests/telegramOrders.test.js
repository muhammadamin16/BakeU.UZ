import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  createOrdersApi,
  BridgeError,
  validateIdentity,
  validateOrder,
} from "../orders/api.js";
import { readOrdersConfig } from "../orders/config.js";
import { createOrdersIntegration } from "../orders/integration.js";
import { createOrdersWorker } from "../orders/worker.js";
import { orderCard } from "../orders/views.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";
import { createUpdateHandler } from "../handlers/router.js";
import {
  nextStatuses,
  normalizePhone,
  validCoordinates,
  deliveryInstant,
  deliveryPayload,
} from "../../telegramOrders/domain.js";
import { createWebsiteOrdersClient } from "../../telegramOrders/client.js";
import { setup, config, mockTelegram, message, callback } from "./helpers.js";

const identity = (role = "SELLER", telegramId = "888") => ({
  linked: true,
  confirmed: true,
  telegramId,
  user: {
    id: role === "SELLER" ? "seller-1" : "buyer-1",
    role,
    status: "active",
  },
  ...(role === "SELLER" ? { shopId: "shop-1" } : {}),
});
function order(patch = {}) {
  return {
    id: "order-1",
    number: "BU-1001",
    sellerId: "seller-1",
    customerId: "buyer-1",
    shopId: "shop-1",
    shopName: "Sweet <Home>",
    buyerName: "Али",
    buyerPhone: "+998901234567",
    items: [{ productId: "p1", title: "<Торт>", price: 85000, qty: 1 }],
    total: 85000,
    status: "pending",
    fulfillment: "delivery",
    address: "Ташкент <адрес>",
    createdAt: "2026-11-20T08:00:00Z",
    scheduledAt: "2026-11-21T09:00:00Z",
    history: [{ status: "pending", at: "2026-11-20T08:00:00Z" }],
    ...patch,
  };
}
function fixture() {
  let saved = order(),
    transitions = 0,
    links = 0;
  const who = (id) =>
    id === "888" ? identity() : id === "999" ? identity("CLIENT", "999") : null;
  const api = {
    identity: async (id) => who(id),
    order: async () => structuredClone(saved),
    transition: async (actor, id, from, to) => {
      assert.equal(actor, "888");
      assert.equal(id, saved.id);
      assert.equal(from, saved.status);
      transitions++;
      saved = {
        ...saved,
        status: to,
        history: [
          ...saved.history,
          { status: to, at: new Date().toISOString() },
        ],
      };
      return saved;
    },
    startLink: async () => {
      links++;
      return {
        id: "a".repeat(48),
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        confirmationUrl:
          "https://bakeu.uz/#/telegram/link?challenge=" + "a".repeat(48),
      };
    },
    list: async () => ({ orders: [structuredClone(saved)], nextPage: null }),
    shop: async () => ({
      id: "shop-1",
      ownerId: "seller-1",
      name: "Sweet Home",
      phone: "+998901234567",
      address: "Ташкент",
      productCount: 1,
      revenue: 0,
      counts: Object.fromEntries(
        [
          "pending",
          "accepted",
          "preparing",
          "ready",
          "delivering",
          "delivered",
          "completed",
          "cancelled",
          "rejected",
        ].map((s) => [s, 0]),
      ),
    }),
    products: async () => ({
      ownerId: "seller-1",
      shopId: "shop-1",
      items: [],
    }),
    claim: async () => ({ jobs: [] }),
  };
  return {
    api,
    get saved() {
      return saved;
    },
    set saved(v) {
      saved = v;
    },
    get transitions() {
      return transitions;
    },
    get links() {
      return links;
    },
  };
}
const lastText = (telegram) =>
  telegram.edits.at(-1)?.text || telegram.messages.at(-1)?.text || "";
const context = (telegram, id = "888") => ({
  telegram,
  chatId: id,
  user: { id: Number(id) },
  config,
  message: { message_id: 1 },
  callback: true,
  showMain: async () => {},
});

test("both main-menu entries are public; configured admin and branded welcome remain available", async () => {
  for (const admin of [false, true]) {
    const buttons = mainKeyboard(config, { admin }).inline_keyboard.flat();
    for (const action of ["bo:buyer", "bo:seller"])
      assert.equal(buttons.filter((b) => b.callback_data === action).length, 1);
    assert.equal(
      buttons.some((b) => b.text.includes("Мой BakeU")),
      false,
    );
  }
  const s = setup(),
    telegram = mockTelegram(),
    f = fixture();
  const orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  const handle = createUpdateHandler({ ...s, telegram, orders });
  try {
    for (const id of [888, 999, 777, 12345])
      await handle(message(id, "/start"));
    assert.equal(telegram.messages[0].type, "photo");
    for (const card of telegram.messages) {
      const buttons = card.reply_markup.inline_keyboard.flat();
      assert.ok(buttons.some((b) => b.callback_data === "bo:buyer"));
      assert.ok(buttons.some((b) => b.callback_data === "bo:seller"));
    }
    assert.ok(
      telegram.messages
        .at(-1)
        .reply_markup.inline_keyboard.flat()
        .some((b) => b.callback_data === "admin:home"),
    );
    await handle(callback(999, "bo:seller"));
    assert.match(lastText(telegram), /прав/);
    await handle(callback(888, "bo:buyer"));
    assert.match(lastText(telegram), /прав/);
  } finally {
    s.db.close();
  }
});
test("own Telegram contact and account ownership proof are separate; no implicit account creation", async () => {
  const f = fixture(),
    telegram = mockTelegram(),
    orders = createOrdersIntegration({
      settings: { enabled: true },
      config,
      telegram,
      api: f.api,
    });
  const ctx = context(telegram, "777");
  await orders.handle(ctx, {
    message: { contact: { user_id: 999, phone_number: "998901234567" } },
  });
  assert.equal(f.links, 0);
  await orders.handle(ctx, {
    message: { contact: { user_id: 777, phone_number: "998 90 123-45-67" } },
  });
  assert.equal(f.links, 1);
  assert.match(telegram.messages[0].text, /именно свой/);
  assert.ok(
    telegram.edits.some((m) =>
      m.reply_markup.inline_keyboard
        .flat()
        .some((b) => b.url?.startsWith("https://bakeu.uz/")),
    ),
  );
  assert.equal(await orders.resolveRole(777), null);
  f.api.startLink = async () => ({
    confirmationUrl: "https://evil.test/#/telegram/link?challenge=secret",
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  });
  await orders.handle(ctx, {
    message: { contact: { user_id: 777, phone_number: "998901234567" } },
  });
  assert.ok(!JSON.stringify(telegram.edits.at(-1)).includes("evil.test"));
});
test("seller flow, duplicate click, forbidden transition, pickup and foreign ownership", async () => {
  const f = fixture(),
    telegram = mockTelegram(),
    orders = createOrdersIntegration({
      settings: { enabled: true },
      config,
      telegram,
      api: f.api,
    });
  const ctx = context(telegram);
  await orders.handle(ctx, callback(888, "bo:act:order-1:p:f"));
  assert.equal(f.transitions, 0);
  for (const [from, to, status] of [
    ["p", "a", "accepted"],
    ["a", "c", "preparing"],
    ["c", "r", "ready"],
    ["r", "d", "delivering"],
    ["d", "v", "delivered"],
    ["v", "f", "completed"],
  ]) {
    await orders.handle(ctx, callback(888, `bo:act:order-1:${from}:${to}`));
    assert.equal(f.saved.status, status);
    const count = f.transitions;
    await orders.handle(ctx, callback(888, `bo:act:order-1:${from}:${to}`));
    assert.equal(f.transitions, count);
  }
  assert.deepEqual(nextStatuses("cancelled", "delivery"), []);
  assert.deepEqual(nextStatuses("rejected", "delivery"), []);
  f.saved = order({ fulfillment: "pickup", status: "ready" });
  await orders.handle(ctx, callback(888, "bo:act:order-1:r:f"));
  assert.equal(f.saved.status, "completed");
  f.saved = order({ sellerId: "another-seller" });
  const count = f.transitions;
  await orders.handle(ctx, callback(888, "bo:detail:order-1:0"));
  assert.match(lastText(telegram), /прав/);
  assert.ok(!lastText(telegram).includes("+998901234567"));
  await orders.handle(ctx, callback(888, "bo:act:order-1:p:a"));
  assert.equal(f.transitions, count);
});
test("history is read again from API after handler recreation; GPS is sent only to owning seller", async () => {
  const f = fixture(),
    telegram = mockTelegram(),
    ctx = context(telegram);
  const calls = [];
  telegram.call = async (method, body) => calls.push({ method, body });
  let orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  await orders.handle(ctx, callback(888, "bo:act:order-1:p:a"));
  orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  await orders.handle(ctx, callback(888, "bo:detail:order-1:0"));
  assert.match(lastText(telegram), /Принят/);
  f.saved = order({
    location: { latitude: 0, longitude: 0, chat_id: "intruder" },
  });
  await orders.handle(ctx, callback(888, "bo:location:order-1"));
  assert.deepEqual(calls[0], {
    method: "sendLocation",
    body: { chat_id: "888", latitude: 0, longitude: 0 },
  });
  await orders.handle(
    context(telegram, "777"),
    callback(777, "bo:location:order-1"),
  );
  assert.equal(calls.length, 1);
});
test("malformed DTOs, group recipients and configuration fail closed; messages stay within limits", () => {
  assert.throws(
    () => validateIdentity(identity("CLIENT", "-100123"), "-100123"),
    BridgeError,
  );
  assert.throws(
    () => validateOrder(order({ status: "constructor" })),
    BridgeError,
  );
  assert.throws(() => readOrdersConfig({ TELEGRAM_ORDERS_ENABLED: "true" }));
  assert.throws(() =>
    readOrdersConfig({
      TELEGRAM_ORDERS_ENABLED: "true",
      GO_BACKEND_URL: "http://external.test",
      TELEGRAM_BRIDGE_TOKEN: "x".repeat(40),
    }),
  );
  assert.equal(normalizePhone("998 (90) 123-45-67"), "+998901234567");
  assert.throws(() => normalizePhone("abc998901234567"));
  assert.equal(validCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(validCoordinates({ latitude: 91, longitude: 0 }), false);
  assert.equal(
    deliveryInstant("2030-01-02", "09:00", Date.parse("2030-01-01T00:00Z")),
    "2030-01-02T04:00:00.000Z",
  );
  assert.throws(() => deliveryInstant("2030-02-30", "09:00"));
  const rendered = orderCard(
    order({
      items: Array.from({ length: 100 }, () => ({
        title: "<".repeat(200),
        price: 1,
        qty: 1,
      })),
      comment: "<".repeat(1000),
      address: "<".repeat(1000),
    }),
    { seller: true },
  );
  assert.ok(rendered.text.length < 4096);
  assert.ok(!rendered.text.includes("<Торт>"));
  assert.ok(
    rendered.reply_markup.inline_keyboard
      .flat()
      .every(
        (b) => !b.callback_data || Buffer.byteLength(b.callback_data) <= 64,
      ),
  );
});
test("durable worker delivers seller/buyer notices; receipt retry does not send twice", async () => {
  const telegram = mockTelegram();
  let acknowledged = false,
    ackAttempts = 0,
    begun = false;
  const job = {
    id: "event-1",
    leaseToken: "lease",
    kind: "order.created",
    recipient: { ...identity(), botStarted: true },
    order: order(),
  };
  const api = {
    claim: async () => ({ jobs: acknowledged ? [] : [job] }),
    begin: async () => {
      if (begun) return { started: false };
      begun = true;
      return { started: true };
    },
    ack: async () => {
      ackAttempts++;
      if (ackAttempts === 1) throw new BridgeError();
      acknowledged = true;
    },
    fail: async () => assert.fail("unexpected failure"),
  };
  const flush = createOrdersWorker(api, telegram, { enabled: true });
  await flush();
  await flush();
  assert.equal(telegram.messages.length, 1);
  assert.equal(ackAttempts, 2);
  assert.match(telegram.messages[0].text, /НОВЫЙ ЗАКАЗ/);
  await createOrdersWorker(api, telegram, { enabled: true })();
  assert.equal(telegram.messages.length, 1);
  let failure;
  const buyerJob = {
    ...job,
    id: "event-2",
    kind: "order.status_changed",
    recipient: { ...identity("CLIENT", "999"), botStarted: true },
    order: order({ status: "accepted" }),
  };
  const buyerApi = {
    claim: async () => ({ jobs: [buyerJob] }),
    begin: async () => ({ started: true }),
    ack: async () => {},
    fail: async (_, f) => {
      failure = f;
    },
  };
  await createOrdersWorker(buyerApi, telegram, { enabled: true })();
  assert.match(telegram.messages.at(-1).text, /Продавец принял/);
  assert.equal(failure, undefined);
});
test("Telegram errors never delete an order and are persisted as retry/blocked/uncertain", async () => {
  for (const [code, state] of [
    [429, "retry"],
    [403, "blocked"],
    [0, "uncertain"],
    [500, "uncertain"],
  ]) {
    const saved = order(),
      failures = [];
    const job = {
      id: "e",
      leaseToken: "lease",
      kind: "order.created",
      recipient: { ...identity(), botStarted: true },
      order: saved,
    };
    const api = {
      claim: async () => ({ jobs: [job] }),
      begin: async () => ({ started: true }),
      ack: async () => assert.fail(),
      fail: async (_, f) => failures.push(f),
    };
    const telegram = {
      send: async () => {
        const e = new Error("redacted");
        e.code = code;
        e.retryAfter = 3;
        throw e;
      },
    };
    await createOrdersWorker(api, telegram, { enabled: true })();
    assert.equal(failures[0].state, state);
    assert.equal(saved.status, "pending");
    if (code === 429) assert.ok(Date.parse(failures[0].retryAt) > Date.now());
  }
});
test("actual HTTP adapter transmits server credential and actor; missing endpoint is not a successful order", async () => {
  const received = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push({
      url: req.url,
      headers: req.headers,
      body: body ? JSON.parse(body) : null,
    });
    res.setHeader("Content-Type", "application/json");
    if (req.url.endsWith("/me")) res.end(JSON.stringify(identity()));
    else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const api = createOrdersApi({
      enabled: true,
      baseUrl: `http://127.0.0.1:${server.address().port}`,
      token: "secret-for-test-only",
    });
    assert.equal((await api.identity("888")).user.role, "SELLER");
    assert.equal(received[0].headers["x-telegram-user-id"], "888");
    assert.equal(
      received[0].headers.authorization,
      "Bearer secret-for-test-only",
    );
    await assert.rejects(
      () =>
        api.transition("888", "order-1", "pending", "accepted", "tg:callback"),
      (e) => e.status === 404,
    );
    assert.deepEqual(received[1].body, {
      expectedStatus: "pending",
      status: "accepted",
    });
    assert.equal(received[1].headers["idempotency-key"], "tg:callback");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("browser adapter reads authoritative history, rejects wrong owner and requires server link confirmation", async () => {
  const calls = [];
  let wrong = false;
  const client = createWebsiteOrdersClient(async (path, options) => {
    calls.push({ path, options });
    if (path === "/me") return { uid: "buyer-1", role: "customer" };
    if (path === "/orders")
      return {
        placed: [order({ customerId: wrong ? "intruder" : "buyer-1" })],
        incoming: [],
      };
    return { linked: false };
  });
  assert.equal((await client.load()).orders[0].id, "order-1");
  wrong = true;
  await assert.rejects(() => client.load());
  await assert.rejects(() => client.confirmLink("a".repeat(48), "password"));
  assert.equal(calls.at(-1).path, "/me/telegram/link/confirm");
});

test("legacy API capabilities block checkout before any POST; pickup strips private GPS", async () => {
  const calls = [];
  const client = createWebsiteOrdersClient(async (path, options) => {
    calls.push({ path, options });
    return { workflowVersion: 1 };
  });
  await assert.rejects(() =>
    client.checkout({
      items: [{ productId: "p1", qty: 1 }],
      requestId: "r",
      delivery: {},
    }),
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/orders/capabilities");
  const result = deliveryPayload(
    {
      fulfillment: "pickup",
      address: "private address",
      location: { latitude: 10, longitude: 20 },
      date: "2030-01-02",
      time: "10:00",
    },
    Date.parse("2030-01-01T00:00Z"),
  );
  assert.equal(result.location, null);
  assert.equal(result.deliveryAddress, "");
});

test("seller can reopen every status and paginate escaped products without Telegram overflow", async () => {
  const f = fixture(),
    telegram = mockTelegram();
  const orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  const ctx = context(telegram);
  await orders.handle(ctx, callback(888, "bo:shop"));
  const buttons = telegram.edits.at(-1).reply_markup.inline_keyboard.flat();
  for (const status of [
    "pending",
    "accepted",
    "preparing",
    "ready",
    "delivering",
    "delivered",
    "completed",
    "cancelled",
    "rejected",
  ]) {
    assert.ok(
      buttons.some(
        (button) => button.callback_data === `bo:list:seller:${status}:0`,
      ),
    );
  }
  f.api.products = async () => ({
    ownerId: "seller-1",
    shopId: "shop-1",
    items: Array.from({ length: 17 }, (_, i) => ({
      id: `p${i}`,
      title: `Product ${i} ` + "<".repeat(500),
      price: 1000,
    })),
  });
  await orders.handle(ctx, callback(888, "bo:products"));
  assert.ok(lastText(telegram).length < 4096);
  assert.match(lastText(telegram), /Product 0/);
  assert.ok(!lastText(telegram).includes("Product 8"));
  await orders.handle(ctx, callback(888, "bo:products:2"));
  assert.match(lastText(telegram), /Product 16/);
  assert.ok(!lastText(telegram).includes("Product 0"));
  await orders.handle(context(telegram, "999"), callback(999, "bo:products"));
  assert.match(lastText(telegram), /прав/);
});

test("worker rejects wrong ownership, unstarted and unconfirmed recipients before any send", async () => {
  for (const recipient of [
    { ...identity(), botStarted: false },
    { ...identity(), botStarted: true, confirmed: false },
    {
      ...identity(),
      botStarted: true,
      user: { id: "intruder", role: "SELLER", status: "active" },
    },
  ]) {
    const failures = [];
    const telegram = mockTelegram();
    const api = {
      claim: async () => ({
        jobs: [
          {
            id: "e",
            leaseToken: "l",
            kind: "order.created",
            recipient,
            order: order(),
          },
        ],
      }),
      begin: async () => assert.fail("must not begin"),
      fail: async (_, failure) => failures.push(failure),
    };
    await createOrdersWorker(api, telegram, { enabled: true })();
    assert.equal(telegram.messages.length, 0);
    assert.equal(failures[0].state, "blocked");
  }
});

test("V2 checkout sends product references and delivery only, awaits committed server orders", async () => {
  const calls = [];
  let committed = true;
  const client = createWebsiteOrdersClient(async (path, options) => {
    calls.push({ path, options });
    if (path === "/orders/capabilities")
      return {
        workflowVersion: 2,
        idempotency: true,
        history: true,
        deliveryScheduling: true,
      };
    return committed ? { orders: [order()] } : {};
  });
  const date = new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 10);
  const input = {
    items: [{ productId: "p1", qty: 2, price: 1, sellerId: "forged" }],
    delivery: {
      fulfillment: "delivery",
      address: " Tashkent ",
      date,
      time: "14:30",
      location: { latitude: 0, longitude: 0, chat_id: "intruder" },
    },
    requestId: "one-logical-checkout",
  };
  const result = await client.checkout(input);
  assert.equal(result.orders[0].id, "order-1");
  const posted = calls.at(-1);
  assert.equal(posted.path, "/orders");
  assert.deepEqual(posted.options.body.items, [{ productId: "p1", qty: 2 }]);
  assert.deepEqual(posted.options.body.location, { latitude: 0, longitude: 0 });
  assert.equal(posted.options.body.deliveryAddress, "Tashkent");
  assert.equal(
    posted.options.headers["Idempotency-Key"],
    "one-logical-checkout",
  );
  assert.equal(posted.options.body.scheduledAt, `${date}T09:30:00.000Z`);
  committed = false;
  await assert.rejects(() => client.checkout(input), /подтвердил/);
  assert.throws(() =>
    readOrdersConfig({
      TELEGRAM_ORDERS_ENABLED: "true",
      GO_BACKEND_URL: "https://backend.example",
      BOT_TOKEN: "x".repeat(40),
      TELEGRAM_BRIDGE_TOKEN: "x".repeat(40),
    }),
  );
});

test("seller entry preserves contact intent and requires existing-account proof; groups and foreign contacts cannot link", async () => {
  const s = setup(),
    telegram = mockTelegram(),
    f = fixture(),
    linkCalls = [];
  const original = f.api.startLink;
  f.api.startLink = async (...args) => {
    linkCalls.push(args);
    return original(...args);
  };
  const orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  const handle = createUpdateHandler({ ...s, telegram, orders });
  try {
    await handle(callback(777, "bo:seller"));
    assert.match(lastText(telegram), /Кабинет продавца/);
    await handle(callback(777, "bo:phone:seller"));
    assert.equal(
      telegram.messages.at(-1).reply_markup.keyboard[0][0].request_contact,
      true,
    );
    const contact = message(777, "");
    contact.message.contact = { user_id: 999, phone_number: "998901234567" };
    await handle(contact);
    assert.equal(linkCalls.length, 0);
    contact.message.contact.user_id = 777;
    contact.message.chat.type = "group";
    await handle(contact);
    assert.equal(linkCalls.length, 0);
    contact.message.chat.type = "private";
    await handle(contact);
    assert.deepEqual(linkCalls[0], ["777", "+998901234567", "SELLER"]);
    assert.match(telegram.messages.at(-2).text, /Доступ ещё не выдан/);
    assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 0);
    assert.equal(s.repo.getState("777").intent, "seller");
    await handle(callback(777, "bo:account:seller"));
    assert.match(lastText(telegram), /Кабинет продавца/);
  } finally {
    s.db.close();
  }
});

test("seller not-found is distinct from an unavailable endpoint; role aliases normalize without granting privileges", async () => {
  const f = fixture(),
    telegram = mockTelegram();
  let failure = new BridgeError(404, "SELLER_NOT_FOUND");
  f.api.startLink = async () => {
    throw failure;
  };
  const orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  const s = setup(),
    ctx = { ...context(telegram, "777"), repo: s.repo };
  try {
    await orders.handle(ctx, callback(777, "bo:seller"));
    await orders.handle(ctx, {
      message: { contact: { user_id: 777, phone_number: "998901234567" } },
    });
    assert.match(lastText(telegram), /Аккаунт продавца не найден/);
    assert.ok(
      telegram.edits
        .at(-1)
        .reply_markup.inline_keyboard.flat()
        .some((b) => b.url?.includes("/register")),
    );
    failure = new BridgeError(404);
    await orders.handle(ctx, {
      message: { contact: { user_id: 777, phone_number: "998901234567" } },
    });
    assert.match(lastText(telegram), /Раздел пока недоступен/);
    assert.ok(!lastText(telegram).includes("продавца не найден"));
    for (const role of ["client", "buyer", "customer"])
      assert.equal(
        validateIdentity(
          {
            ...identity("CLIENT", "999"),
            user: { id: "buyer-1", role, status: "active" },
          },
          "999",
        ).user.role,
        "CLIENT",
      );
    assert.equal(
      validateIdentity(
        {
          ...identity(),
          user: { id: "seller-1", role: "seller", status: "active" },
        },
        "888",
      ).user.role,
      "SELLER",
    );
    assert.throws(() =>
      validateIdentity(
        {
          ...identity(),
          user: { id: "seller-1", role: "constructor", status: "active" },
        },
        "888",
      ),
    );
    assert.throws(() =>
      validateIdentity(
        {
          ...identity(),
          user: { id: "seller-1", role: "seller", status: "frozen" },
        },
        "888",
      ),
    );
  } finally {
    s.db.close();
  }
});

test("numbered seller list uses only the current page and rechecks owner after handler recreation", async () => {
  const s = setup(),
    telegram = mockTelegram(),
    f = fixture(),
    reads = [];
  const saved = [order(), order({ id: "order-2", number: "BU-1002" })];
  f.api.list = async (actor, audience, view, page) => {
    assert.equal(actor, "888");
    assert.equal(audience, "seller");
    assert.equal(view, "all");
    return {
      orders: page === 0 ? saved : [saved[1]],
      nextPage: page === 0 ? 1 : null,
    };
  };
  f.api.order = async (actor, id) => {
    reads.push(id);
    return saved.find((o) => o.id === id);
  };
  const orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  let handle = createUpdateHandler({ ...s, telegram, orders });
  try {
    await handle(callback(888, "bo:list:seller:all:0"));
    assert.match(lastText(telegram), /1\. #BU-1001 — Али — 85/);
    assert.equal(s.repo.getState("888").orderIds.length, 2);
    assert.ok(!JSON.stringify(s.repo.getState("888")).includes("buyerPhone"));
    handle = createUpdateHandler({ ...s, telegram, orders });
    await handle(message(888, "2"));
    assert.deepEqual(reads, ["order-2"]);
    assert.match(telegram.messages.at(-1).text, /Order ID: <code>order-2/);
    assert.ok(
      telegram.messages
        .at(-1)
        .reply_markup.inline_keyboard.flat()
        .some((b) => b.callback_data === "bo:list:seller:all:0"),
    );
    await handle(callback(888, "bo:list:seller:all:1"));
    await handle(message(888, "2"));
    assert.deepEqual(reads, ["order-2"]);
    assert.match(telegram.messages.at(-1).text, /номер из текущего списка/);
    await handle(message(888, "1"));
    assert.deepEqual(reads, ["order-2", "order-2"]);
    await handle(callback(888, "bo:list:seller:all:0"));
    f.api.identity = async () => ({
      ...identity(),
      user: { id: "new-owner", role: "SELLER", status: "active" },
      shopId: "new-shop",
    });
    await handle(message(888, "1"));
    assert.deepEqual(reads, ["order-2", "order-2"]);
    assert.equal(s.repo.getState("888"), null);
  } finally {
    s.db.close();
  }
});

test("buyer history is server-owned, refreshes current status, and ignores expired selection or support numbers", async () => {
  const s = setup(),
    telegram = mockTelegram(),
    f = fixture();
  let reads = 0;
  const original = f.api.order;
  f.api.order = async (...args) => {
    reads++;
    return original(...args);
  };
  f.api.list = async (actor, audience, view) => {
    assert.equal(actor, "999");
    assert.equal(audience, "buyer");
    assert.equal(view, "all");
    return { orders: [f.saved], nextPage: null };
  };
  const orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  const handle = createUpdateHandler({ ...s, telegram, orders });
  try {
    await handle(callback(999, "bo:buyer"));
    assert.match(lastText(telegram), /МОИ ЗАКАЗЫ/);
    await handle(message(999, "1"));
    assert.equal(reads, 1);
    f.saved = order({
      status: "preparing",
      history: [
        ...f.saved.history,
        { status: "preparing", at: "2026-11-20T12:00:00Z" },
      ],
    });
    await handle(callback(999, "bo:detail:order-1:0"));
    assert.match(lastText(telegram), /Готовится/);
    assert.equal(reads, 2);
    assert.ok(
      telegram.edits
        .at(-1)
        .reply_markup.inline_keyboard.flat()
        .some((b) => b.text === "🔄 Обновить"),
    );
    await handle(callback(999, "bo:buyer"));
    s.repo.setState("999", {
      ...s.repo.getState("999"),
      expiresAt: Date.now() - 1,
    });
    await handle(message(999, "1"));
    assert.equal(reads, 2);
    assert.match(telegram.messages.at(-1).text, /устарел/);
    await handle(callback(999, "support"));
    await handle(message(999, "1"));
    assert.equal(reads, 2);
    assert.match(telegram.messages.at(-1).text, /вопрос/);
  } finally {
    s.db.close();
  }
});

test("saved delivery location is available only to owning participants; pickup and address-only orders never send GPS", async () => {
  const f = fixture(),
    telegram = mockTelegram(),
    calls = [];
  telegram.call = async (method, body) => calls.push({ method, body });
  f.saved = order({
    location: { latitude: 0, longitude: 0, chat_id: "intruder" },
  });
  const orders = createOrdersIntegration({
    settings: { enabled: true },
    config,
    telegram,
    api: f.api,
  });
  await orders.handle(
    context(telegram, "999"),
    callback(999, "bo:detail:order-1:0"),
  );
  assert.match(lastText(telegram), /Координаты: 0\.000000, 0\.000000/);
  assert.ok(
    telegram.edits
      .at(-1)
      .reply_markup.inline_keyboard.flat()
      .some((b) => b.text === "📍 Открыть карту"),
  );
  await orders.handle(
    context(telegram, "999"),
    callback(999, "bo:location:order-1"),
  );
  assert.deepEqual(calls, [
    {
      method: "sendLocation",
      body: { chat_id: "999", latitude: 0, longitude: 0 },
    },
  ]);
  await orders.handle(
    context(telegram, "777"),
    callback(777, "bo:location:order-1"),
  );
  assert.equal(calls.length, 1);
  f.saved = order({
    customerId: "intruder",
    location: { latitude: 41, longitude: 69 },
  });
  await orders.handle(
    context(telegram, "999"),
    callback(999, "bo:location:order-1"),
  );
  assert.equal(calls.length, 1);
  f.saved = order();
  await orders.handle(context(telegram), callback(888, "bo:location:order-1"));
  assert.match(telegram.messages.at(-1).text, /Ташкент/);
  assert.equal(calls.length, 1);
  f.saved = order({
    fulfillment: "pickup",
    location: { latitude: 41, longitude: 69 },
  });
  assert.ok(
    !orderCard(f.saved, { seller: true })
      .reply_markup.inline_keyboard.flat()
      .some((b) => b.callback_data?.startsWith("bo:location:")),
  );
  await orders.handle(context(telegram), callback(888, "bo:location:order-1"));
  assert.equal(calls.length, 1);
  f.saved = order({ location: { latitude: 91, longitude: 69 } });
  await orders.handle(context(telegram), callback(888, "bo:location:order-1"));
  assert.equal(calls.length, 1);
});

test("bridge sends requested role and all-view contract; missing bridge is not seller-not-found", async () => {
  const calls = [];
  let responseCode = 404;
  const api = createOrdersApi(
    { enabled: true, baseUrl: "https://backend.example", token: "test-only" },
    {
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(
          JSON.stringify(
            responseCode === 404 ? {} : { code: "SELLER_NOT_FOUND" },
          ),
          { status: 404 },
        );
      },
    },
  );
  await assert.rejects(
    () => api.startLink("888", "+998901234567", "SELLER"),
    (e) => e.status === 404 && !e.code,
  );
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    phone: "+998901234567",
    requestedRole: "SELLER",
  });
  responseCode = 400;
  await assert.rejects(
    () => api.startLink("888", "+998901234567", "SELLER"),
    (e) => e.code === "SELLER_NOT_FOUND",
  );
  await assert.rejects(() => api.list("888", "seller", "all", 1));
  assert.match(calls.at(-1).url, /audience=seller&view=all&page=1/);
});

test("normalized seller role keeps seller notification actions and the confirmed recipient", async () => {
  const telegram = mockTelegram();
  const job = {
    id: "alias-event",
    leaseToken: "lease",
    kind: "order.created",
    recipient: {
      ...identity(),
      botStarted: true,
      user: { id: "seller-1", role: "seller", status: "active" },
    },
    order: order(),
  };
  const api = {
    claim: async () => ({ jobs: [job] }),
    begin: async () => ({ started: true }),
    ack: async () => {},
    fail: async () => assert.fail("confirmed owner must not be rejected"),
  };
  await createOrdersWorker(api, telegram, { enabled: true })();
  assert.equal(telegram.messages[0].id, "888");
  assert.match(telegram.messages[0].text, /НОВЫЙ ЗАКАЗ/);
  assert.ok(
    telegram.messages[0].reply_markup.inline_keyboard
      .flat()
      .some((b) => b.callback_data === "bo:act:order-1:p:a"),
  );
});

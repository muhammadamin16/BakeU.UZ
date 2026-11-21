import { seedLegacyApplication } from "./helpers.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  setup,
  fields,
  mockTelegram,
  message,
  callback,
  config,
} from "./helpers.js";
import { createUpdateHandler } from "../handlers/router.js";
import { createOutboxWorker } from "../services/adminNotifications.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";
import { readConfig } from "../config/index.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
test("main menu has eight buttons and working website link", () => {
  const buttons = mainKeyboard(config).inline_keyboard.flat();
  assert.equal(buttons.length, 8);
  assert.equal(buttons[0].url, "https://bakeu.uz");
  assert.ok(buttons.some((x) => x.callback_data === "support"));
});
test("non-admin forged callbacks cannot list users or approve applications", async () => {
  const s = setup(),
    telegram = mockTelegram();
  try {
    const { user } = await s.auth.register(fields("seller"));
    const application = seedLegacyApplication(s.db, s.repo, user);
    const handle = createUpdateHandler({ ...s, telegram });
    await handle(callback(999, `app:approve:${application.id}`));
    assert.equal(
      s.repo.application(application.id).status,
      "На проверке",
    );
    assert.match(telegram.messages.at(-1).text, /только администратору/);
    await handle(callback(999, "admin:customers:0"));
    assert.ok(!telegram.messages.at(-1).text.includes(fields().email));
  } finally {
    s.db.close();
  }
});
test("support ticket and admin reply survive handler recreation", async () => {
  const s = setup(),
    telegram = mockTelegram();
  try {
    let handle = createUpdateHandler({ ...s, telegram });
    await handle(callback(999, "support"));
    handle = createUpdateHandler({ ...s, telegram });
    await handle(message(999, "Как открыть магазин?"));
    const ticket = s.repo.listTickets()[0];
    assert.equal(ticket.body, "Как открыть магазин?");
    assert.equal(s.repo.stats().tickets, 1);
    await handle(callback(12345, `ticket:reply:${ticket.id}`));
    await handle(message(12345, "Откройте раздел регистрации продавца."));
    assert.equal(s.repo.ticket(ticket.id).status, "Ответ отправлен");
    assert.ok(s.repo.pendingOutbox().some((x) => x.chat_id === "999"));
    await createOutboxWorker(s.repo, telegram)();
    assert.equal(s.repo.pendingOutbox().length, 0);
    assert.ok(
      telegram.messages.some(
        (x) => x.id === "999" && x.text.includes("Ответ поддержки"),
      ),
    );
  } finally {
    s.db.close();
  }
});
test("reject flow stores reason and repeated decision is refused", async () => {
  const s = setup(),
    telegram = mockTelegram();
  try {
    const { user } = await s.auth.register(fields("seller"));
    const application = seedLegacyApplication(s.db, s.repo, user);
    const handle = createUpdateHandler({ ...s, telegram });
    await handle(callback(12345, `app:reject:${application.id}`));
    await handle(message(12345, "Уточните адрес магазина."));
    assert.equal(s.repo.application(application.id).status, "Отклонено");
    assert.equal(
      s.repo.application(application.id).reason,
      "Уточните адрес магазина.",
    );
    await handle(callback(12345, `app:approve:${application.id}`));
    assert.equal(s.repo.application(application.id).status, "Отклонено");
  } finally {
    s.db.close();
  }
});
test("outbox retries failed sends without losing records", async () => {
  const s = setup();
  try {
    s.repo.queue("12345", { text: "test" }, "unique");
    s.repo.queue("12345", { text: "test" }, "unique");
    const flush = createOutboxWorker(s.repo, {
      send: async () => {
        throw Object.assign(Error("simulated"), { code: 429, retryAfter: 3 });
      },
    });
    await flush();
    const row = s.db.prepare("SELECT * FROM outbox").get();
    assert.equal(row.attempts, 1);
    assert.equal(row.status, "pending");
    assert.ok(row.next_at > Date.now());
  } finally {
    s.db.close();
  }
});
test("config rejects secrets missing and wildcard CORS; limiter expires", () => {
  assert.throws(() => readConfig({}), /BOT_TOKEN/);
  const env = {
    BOT_TOKEN: "123456:abcdefghijklmnopqrstuvwxy",
    ADMIN_IDS: "12345",
    ALLOWED_ORIGINS: "*",
  };
  assert.throws(() => readConfig(env), /ORIGINS/);
  const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.ok(allow("one", 1000));
  assert.ok(allow("one", 1001));
  assert.equal(allow("one", 1002), false);
  assert.ok(allow("one", 2001));
});

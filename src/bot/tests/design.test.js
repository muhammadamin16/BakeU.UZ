import test from "node:test";
import assert from "node:assert/strict";
import { setup, mockTelegram, message, callback, config } from "./helpers.js";
import { createUpdateHandler } from "../handlers/router.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";
import { createTelegram, TelegramError } from "../services/telegram.js";
import { renderScreen } from "../services/screens.js";
import { accountMessage, ticketMessage } from "../utils/formatMessage.js";

test("start sends branded photo; only admins see management button", async () => {
  const s = setup(),
    telegram = mockTelegram();
  try {
    const handle = createUpdateHandler({ ...s, telegram });
    await handle(message(999, "/start"));
    const card = telegram.messages[0];
    assert.equal(card.type, "photo");
    assert.equal(card.parse_mode, "HTML");
    assert.ok(card.caption.includes("<b>BakeU"));
    assert.equal(card.reply_markup.inline_keyboard.flat().length, 8);
    await handle(message(12345, "/start"));
    assert.ok(
      telegram.messages[1].reply_markup.inline_keyboard
        .flat()
        .some((b) => b.callback_data === "admin:home"),
    );
    assert.equal(mainKeyboard(config).inline_keyboard.flat().length, 8);
  } finally {
    s.db.close();
  }
});
test("photo sections edit captions and back navigation does not send extra menus", async () => {
  const s = setup(),
    telegram = mockTelegram();
  try {
    const handle = createUpdateHandler({ ...s, telegram });
    for (const action of ["about", "contact:email", "main"]) {
      const update = callback(999, action);
      update.callback_query.message.photo = [{ file_id: "photo-id" }];
      await handle(update);
    }
    assert.equal(telegram.messages.length, 0);
    assert.equal(telegram.edits.length, 3);
    assert.ok(
      telegram.edits.every((e) => e.caption && e.caption.length <= 1024),
    );
    assert.ok(
      telegram.edits[1].reply_markup.inline_keyboard
        .flat()
        .some((b) => b.copy_text?.text === config.supportEmail),
    );
  } finally {
    s.db.close();
  }
});
test("leaving support cancels stale draft so normal messages are not tickets", async () => {
  const s = setup(),
    telegram = mockTelegram();
  try {
    const handle = createUpdateHandler({ ...s, telegram });
    await handle(callback(999, "support"));
    assert.equal(s.repo.getState("999").kind, "support");
    await handle(callback(999, "about"));
    assert.equal(s.repo.getState("999"), null);
    await handle(message(999, "Обычное сообщение"));
    assert.equal(s.repo.stats().tickets, 0);
  } finally {
    s.db.close();
  }
});
test("identical screen is ignored; uneditable old message falls back once", async () => {
  const telegram = mockTelegram();
  const ctx = {
    telegram,
    chatId: "999",
    message: { message_id: 1 },
    callback: true,
  };
  telegram.edit = async () => {
    const e = new TelegramError(400);
    e.reason = "not_modified";
    throw e;
  };
  await renderScreen(ctx, { text: "<b>Menu</b>" });
  assert.equal(telegram.messages.length, 0);
  telegram.edit = async () => {
    throw new TelegramError(400);
  };
  await renderScreen(ctx, { text: "<b>Menu</b>" });
  assert.equal(telegram.messages.length, 1);
});
test("photo upload uses native multipart transport without JSON encoding PNG", async () => {
  let captured;
  const api = createTelegram("123:dummy-test-token", {
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return { json: async () => ({ ok: true, result: { message_id: 1 } }) };
    },
  });
  await api.photo("999", new Uint8Array([137, 80, 78, 71]), {
    caption: "BakeU",
    reply_markup: { inline_keyboard: [] },
  });
  assert.ok(captured.url.endsWith("/sendPhoto"));
  assert.ok(captured.options.body instanceof FormData);
  assert.equal(captured.options.body.get("photo").type, "image/png");
  assert.equal(captured.options.body.get("caption"), "BakeU");
  assert.deepEqual(JSON.parse(captured.options.body.get("reply_markup")), {
    inline_keyboard: [],
  });
});
test("dynamic admin records are HTML escaped", () => {
  const at = "2026-11-16T00:00:00Z";
  const card = accountMessage({
    firstName: "<script>",
    lastName: "A&B",
    role: "client",
    id: "id",
    phone: "123",
    email: "x@example.com",
    createdAt: at,
  });
  assert.ok(card.includes("&lt;script&gt;"));
  assert.ok(card.includes("A&amp;B"));
  const ticket = ticketMessage({
    id: "123456789",
    chatId: "1",
    name: "<b>User</b>",
    body: '<a href="x">test</a>',
    status: "Открыт",
    createdAt: at,
  });
  assert.ok(!ticket.includes("<a href="));
  assert.ok(ticket.includes("&lt;a"));
});

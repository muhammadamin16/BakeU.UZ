import test from "node:test";
import assert from "node:assert/strict";
import { setup, mockTelegram, message } from "./helpers.js";
import { createUpdateHandler } from "../handlers/router.js";
import { createOrdersApi } from "../orders/api.js";
import { readOrdersConfig } from "../orders/config.js";

test("Go account verification accepts only a private actor's own contact and never creates a SQLite user", async () => {
  const s = setup(), telegram = mockTelegram(), calls = [];
  const token = "a".repeat(48);
  const handle = createUpdateHandler({ ...s, telegram, phoneAccounts: {
    phoneCode: async (...args) => { calls.push(args); return { code: "012345" }; },
  } });
  const contact = (id, own = id, type = "private") => ({ message: {
    chat: { id, type }, from: { id }, contact: { user_id: own, phone_number: "+998901234567" },
  } });
  try {
    await handle(message(711, `/start goauth_${token}`));
    assert.equal(s.repo.getState("711").kind, "go_verify_phone");
    await handle(contact(711, 999));
    await handle(contact(711, 711, "group"));
    assert.equal(calls.length, 0);
    await handle(contact(711));
    assert.deepEqual(calls, [["711", token, "+998901234567"]]);
    assert.match(telegram.messages.at(-1).text, /012345/);
    assert.equal(telegram.messages.at(-1).reply_markup.remove_keyboard, true);
    assert.equal(s.repo.getState("711"), null);
    assert.equal(s.repo.stats().customers, 0);
    await handle(message(712, `/start goauth_${token}`));
    s.repo.setState("712", { kind: "go_verify_phone", token, expiresAt: Date.now() - 1 });
    await handle(contact(712));
    assert.equal(calls.length, 1);
    assert.match(telegram.messages.at(-1).text, /устарела/);
  } finally { s.db.close(); }
});

test("Go phone proof service uses the protected bridge and cannot enable order actions accidentally", async () => {
  const settings = readOrdersConfig({ GO_ACCOUNTS_ENABLED: "true", GO_BACKEND_URL: "https://backend.example", TELEGRAM_BRIDGE_TOKEN: "s".repeat(40) });
  assert.equal(settings.enabled, false);
  assert.equal(settings.accountsEnabled, true);
  const calls = [];
  const api = createOrdersApi(settings, { fetchImpl: async (path, options) => {
    calls.push({ path, options });
    return Response.json({ code: "123456" });
  } });
  await api.phoneCode("711", "a".repeat(48), "+998901234567");
  assert.equal(calls[0].path, "https://backend.example/api/integrations/telegram/auth/phone/contact");
  assert.equal(calls[0].options.headers["X-Telegram-User-Id"], "711");
  assert.equal(calls[0].options.headers.Authorization, "Bearer " + "s".repeat(40));
  await assert.rejects(api.identity("711"));
  assert.equal(calls.length, 1);
  assert.throws(() => api.phoneCode("711", "invalid", "+998901234567"));
});

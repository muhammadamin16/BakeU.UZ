import test from "node:test";
import assert from "node:assert/strict";
import { setup, mockTelegram, message } from "./helpers.js";
import { createUpdateHandler } from "../handlers/router.js";

test("Telegram registration verifies own shared contact before issuing code", async () => {
  const s = setup();
  const telegram = mockTelegram();
  try {
    const form = { firstName: "Алия", lastName: "Каримова", phone: "+998 90 123 45 67", password: "safe-test-password", role: "client" };
    const start = await s.auth.startRegistration(form);
    const handle = createUpdateHandler({ ...s, telegram });
    await handle(message(777, `/start verify_${start.token}`));
    assert.match(telegram.messages.at(-1).text, /подтвердите номер/);
    await handle({
      update_id: 2,
      message: {
        chat: { id: 777, type: "private" },
        from: { id: 777, first_name: "Алия" },
        contact: { user_id: 999, phone_number: form.phone },
      },
    });
    assert.match(telegram.messages.at(-1).text, /именно свой номер/);
    await assert.rejects(async () => s.auth.verifyRegistration({token:start.token, code:"000000"}), e => e.status === 400);
    await handle({
      update_id: 3,
      message: {
        chat: { id: 777, type: "private" },
        from: { id: 777, first_name: "Алия" },
        contact: { user_id: 777, phone_number: form.phone },
      },
    });
    const sms = telegram.messages.at(-1).text;
    const code = sms.match(/\d{6}/)?.[0];
    assert.ok(code);
    const done = s.auth.verifyRegistration({ token: start.token, code });
    assert.equal(done.user.phone, "998901234567");
    assert.equal(done.user.email, "");
    assert.equal(s.repo.stats().customers, 1);
    assert.throws(() => s.auth.verifyRegistration({ token: start.token, code }), e => e.status === 400);
  } finally {
    s.db.close();
  }
});

// Cross-repository contract test. Run only against the disposable Go/Mongo
// fixture described in docs/production/PHONE_ONLY_AUTH.md. The fixed fake
// service credential is intentionally incompatible with a real deployment.
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { phoneStartPayload } from "../src/pages/Auth/phoneAccountForm.js";
import { createOrdersApi } from "../src/bot/orders/api.js";
import { createUpdateHandler } from "../src/bot/handlers/router.js";
import { setup, mockTelegram, message } from "../src/bot/tests/helpers.js";

export const fixtureBridgeToken = "local-test-telegram-bridge-secret-at-least32";
const base = process.env.BAKEU_PHONE_CONTRACT_GO_URL;
let stage = "configuration";
let fixture;
try {
  assert.ok(base, "Set BAKEU_PHONE_CONTRACT_GO_URL to the disposable Go fixture.");
  const url = new URL(base);
  assert.ok(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname) && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/");
  const origin = "https://phone-contract.test";
  async function call(path, body, extra = {}) {
    const res = await fetch(url.origin + "/api" + path, {
      method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, data: await res.json(), cookie: res.headers.get("set-cookie")?.split(";")[0] };
  }
  stage = "fixture_preflight";
  const readiness = await fetch(url.origin + "/readyz");
  assert.equal(readiness.status, 200);
  const diagnostic = await call("/integrations/telegram/diagnostics", undefined, { Authorization: `Bearer ${fixtureBridgeToken}` });
  assert.equal(diagnostic.status, 200);
  assert.equal(diagnostic.data.phoneAccounts, true);
  assert.equal(diagnostic.data.refreshSessions, true);
  assert.equal(diagnostic.data.transactionsAvailable, true);
  fixture = setup();
  const telegram = mockTelegram();
  const bridge = createOrdersApi({ enabled: true, accountsEnabled: true, baseUrl: url.origin, token: fixtureBridgeToken });
  const handler = createUpdateHandler({ ...fixture, telegram, phoneAccounts: bridge });
  const headers = { Origin: origin, "X-BakeU-Session": "browser" };
  async function proof(id, phone, actor) {
    await handler(message(actor, `/start goauth_${id}`));
    const contact = { message: { chat: { id: actor, type: "private" }, from: { id: actor }, contact: { user_id: actor, phone_number: phone } } };
    const count = telegram.messages.length;
    await handler({ message: { ...contact.message, forward_origin: { type: "user" } } });
    assert.equal(telegram.messages.length, count + 1);
    assert.ok(!telegram.messages.at(-1).text.includes("Код BakeU:"));
    await handler(contact);
    const code = telegram.messages.at(-1).text.match(/Код BakeU: (\d{6})/)?.[1];
    assert.ok(code);
    return code;
  }
  for (const role of ["customer", "seller"]) {
    stage = role + "_registration";
    const phone = "+99890" + randomInt(1000000, 9999999);
    const actor = randomInt(100000000, 999999999);
    const body = phoneStartPayload({ role, firstName: "Contract", lastName: "Fixture", phone, marketName: "Contract bakery", address: "Tashkent fixture street 1", lat: 41.31, lng: 69.28 }, true);
    const started = await call("/auth/phone/start", body, headers);
    assert.equal(started.status, 201);
    assert.equal(started.data.user, undefined);
    assert.equal(started.data.token, undefined);
    const code = await proof(started.data.id, phone, actor);
    const verified = await call("/auth/phone/verify", { id: started.data.id, code }, headers);
    assert.equal(verified.status, 200);
    const { user, token } = verified.data;
    assert.equal(user.verifiedPhoneE164, phone);
    assert.equal(user.firstName, "Contract");
    assert.equal(user.email, undefined);
    assert.equal(user.passwordHash, undefined);
    assert.ok(verified.cookie?.startsWith("__Host-bakeu-refresh="));
    assert.equal(verified.data.refreshToken, undefined);
    const protectedHeaders = { Authorization: "Bearer " + token };
    const me = await call("/me", undefined, protectedHeaders);
    assert.equal(me.status, 200);
    assert.equal(me.data.uid, user.uid);
    if (role === "seller") {
      assert.equal(me.data.market.status, "approved");
      assert.equal(me.data.market.sellerId, user.uid);
      assert.equal(me.data.market.address, body.address);
      assert.equal(me.data.market.lat, body.lat);
      assert.equal(me.data.market.lng, body.lng);
      assert.equal((await bridge.identity(String(actor))).shopId, me.data.market.id);
    }
    assert.equal((await call("/auth/phone/verify", { id: started.data.id, code }, headers)).status, 409);
    stage = role + "_duplicate_phone";
    const duplicate = await call("/auth/phone/start", body, headers);
    assert.equal(duplicate.status, 201);
    const duplicateCode = await proof(duplicate.data.id, phone, actor);
    assert.equal((await call("/auth/phone/verify", { id: duplicate.data.id, code: duplicateCode }, headers)).status, 409);
    stage = role + "_login_and_refresh";
    const login = await call("/auth/phone/start", phoneStartPayload({ phone }, false), headers);
    assert.equal(login.status, 201);
    const loginCode = await proof(login.data.id, phone, actor);
    const logged = await call("/auth/phone/verify", { id: login.data.id, code: loginCode }, headers);
    assert.equal(logged.status, 200);
    assert.equal(logged.data.user.uid, user.uid);
    const refreshed = await call("/auth/refresh", {}, { ...headers, Cookie: verified.cookie });
    assert.equal(refreshed.status, 200);
    const stillMe = await call("/me", undefined, { Authorization: "Bearer " + refreshed.data.token });
    assert.equal(stillMe.data.uid, user.uid);
  }
  assert.equal(fixture.db.prepare("SELECT COUNT(*) AS total FROM users").get().total, 0);
  console.log(JSON.stringify({ ok: true, buyerAndSellerPhoneOnly: true, realGoMongoAndBotHandler: true, sellerApprovedWithCoordinates: true, duplicatePhoneRefused: true, codeReplayRefused: true, loginUIDPreserved: true, existingRefreshSessionPreserved: true, sqliteAccountsCreated: 0, telegramNetworkCalled: false, productionTouched: false }));
} catch {
  console.error(JSON.stringify({ ok: false, stage, productionTouched: false }));
  process.exitCode = 1;
} finally { fixture?.db.close(); }

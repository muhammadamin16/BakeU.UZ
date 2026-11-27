import assert from "node:assert/strict";
import test from "node:test";
import { phoneStartPayload, validPhoneChallenge, readPhonePending, savePhonePending, clearPhonePending } from "../pages/Auth/phoneAccountForm.js";

const draft = { firstName: " Али ", lastName: " Каримов ", phone: "+998 90 123 45 67", role: "customer", email: "discard@example.invalid", password: "never-send", verifiedPhoneE164: "+998909999999", uid: "forged", marketName: "Shop", address: "Tashkent street 1", lat: 41.31, lng: 69.28 };

test("phone-only buyer/login payloads exclude credentials, identity claims and shop data", () => {
  assert.deepEqual(phoneStartPayload(draft, true), { purpose: "register", phone: "998901234567", firstName: "Али", lastName: "Каримов", role: "customer" });
  assert.deepEqual(phoneStartPayload(draft, false), { purpose: "login", phone: "+998 90 123 45 67" });
});
test("seller signup requires and preserves explicitly chosen coordinates and address", () => {
  const seller = { ...draft, role: "seller" };
  const body = phoneStartPayload(seller, true);
  assert.deepEqual(body, { purpose: "register", phone: "998901234567", firstName: "Али", lastName: "Каримов", role: "seller", marketName: "Shop", address: "Tashkent street 1", lat: 41.31, lng: 69.28 });
  for (const change of [{ lat: null }, { lng: null }, { lat: "41" }, { lat: NaN }, { lat: Infinity }, { lat: 91 }, { lng: 181 }, { address: " " }, { marketName: "x" }, { firstName: "" }, { lastName: "" }, { role: "admin" }]) assert.throws(() => phoneStartPayload({ ...seller, ...change }, true));
  assert.equal(phoneStartPayload({ ...seller, lat: 0, lng: 0 }, true).lat, 0);
});
test("pending phone proof survives reload without persisting PII/credentials and expires safely", () => {
  const map = new Map();
  const storage = { setItem: (k,v) => map.set(k,v), getItem: (k) => map.get(k), removeItem: (k) => map.delete(k) };
  const id = "a".repeat(48), pending = { id, telegramUrl: `https://t.me/BakeUuzBot?start=goauth_${id}`, expiresAt: new Date(Date.now()+60000).toISOString(), email: "discard", password: "discard", draft };
  assert.equal(validPhoneChallenge(pending), true);
  const saved = savePhonePending("register", pending, storage);
  assert.deepEqual(Object.keys(saved).sort(), ["expiresAt", "id", "telegramUrl"]);
  assert.deepEqual(readPhonePending("register", storage), saved);
  assert.equal(readPhonePending("login", storage), null);
  for (const url of ["https://evil.invalid/", `https://t.me/BakeUuzBot?start=goauth_${"b".repeat(48)}`, pending.telegramUrl+"&extra=1", pending.telegramUrl+"#hash", "javascript:alert(1)"]) assert.equal(validPhoneChallenge({ ...pending, telegramUrl:url }), false);
  assert.equal(validPhoneChallenge({ ...pending, expiresAt:new Date(Date.now()-1).toISOString() }), false);
  assert.throws(() => savePhonePending("register", { ...pending, expiresAt:"invalid" }, storage));
  clearPhonePending("register",storage);
  assert.equal(readPhonePending("register",storage),null);
  const unavailable = { setItem(){throw Error("blocked")},getItem(){throw Error("blocked")},removeItem(){throw Error("blocked")} };
  assert.equal(savePhonePending("register",pending,unavailable).id,id);
  assert.equal(readPhonePending("register",unavailable),null);
});

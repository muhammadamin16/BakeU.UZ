import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWebsiteUrl } from "./websiteUrl.js";

test("plain admin and account URLs become HashRouter routes on any local port or public origin", () => {
  for (const origin of [
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "https://bake-u-uz-self.vercel.app",
  ])
    for (const path of [
      "/admin",
      "/admin/",
      "/admin/products/P101",
      "/admin/telegram",
      "/account/orders?order=123",
      "/login",
      "/register",
    ])
      assert.equal(normalizeWebsiteUrl(origin + path).href, origin + "/#" + path);
});
test("collection filters are retained inside the normalized admin route", () => {
  assert.equal(
    normalizeWebsiteUrl(
      "http://localhost:5173/admin/products?sellerId=S1&q=%D1%82%D0%BE%D1%80%D1%82",
    ).href,
    "http://localhost:5173/#/admin/products?sellerId=S1&q=%D1%82%D0%BE%D1%80%D1%82",
  );
});
test("explicit hash routes and non-admin paths are unchanged", () => {
  for (const path of [
    "/#/admin",
    "/admin/#/admin/orders",
    "/administrator",
    "/api/miniapp/admin/customers",
    "/cart",
    "/",
    "/admin#tgWebAppData=signed-data",
  ])
    assert.equal(
      normalizeWebsiteUrl("https://example.test" + path).href,
      "https://example.test" + path,
    );
});
test("signed Telegram launch data and Mini App mode are never moved or rewritten", () => {
  for (const path of [
    "/admin?miniapp=1&screen=admin",
    "/admin?tgWebAppData=user%3D123%26hash%3Dabc",
    "/admin?tgWebAppVersion=7.0",
    "/admin#tgWebAppData=signed&tgWebAppVersion=7.0",
  ])
    assert.equal(
      normalizeWebsiteUrl("https://example.test" + path).href,
      "https://example.test" + path,
    );
});

import test from "node:test";
import assert from "node:assert/strict";
import { canPreviewLocalAdmin } from "./adminAccess.js";

const local = { development: true, hostname: "127.0.0.1", pathname: "/admin" };
test("local development can preview only the existing browser demo routes", () => {
  const paths = [
    "/admin",
    "/admin/",
    "/admin/customers",
    "/admin/customers/U101",
    "/admin/sellers/seller-S101",
    "/admin/shops/S101",
    "/admin/products/P101",
    "/admin/orders/O101",
    "/admin/subscriptions/B101",
    "/admin/applications",
    "/admin/notifications",
    "/admin/history",
    "/admin/settings/",
  ];
  for (const hostname of ["localhost", "127.0.0.1", "::1", "[::1]"])
    for (const pathname of paths)
      assert.equal(
        canPreviewLocalAdmin({ ...local, hostname, pathname }),
        true,
        hostname + pathname,
      );
});
test("the server-backed Telegram route and unknown routes never get local preview access", () => {
  for (const pathname of [
    "/admin/telegram",
    "/admin/telegram/",
    "/admin/telegram/customers",
    "/admin/TELEGRAM",
    "/admin/%74elegram",
    "/admin//telegram",
    "/admin/settings/telegram",
    "/admin/unknown",
    "/api/miniapp/admin/customers",
    "/",
    "/miniapp",
  ])
    assert.equal(canPreviewLocalAdmin({ ...local, pathname }), false, pathname);
});
test("production builds and public development hosts cannot use local admin preview", () => {
  assert.equal(canPreviewLocalAdmin({ ...local, development: false }), false);
  for (const hostname of [
    "bakeu.uz",
    "localhost.attacker.test",
    "127.0.0.1.attacker.test",
    "192.168.1.10",
    "0.0.0.0",
    "",
  ])
    assert.equal(canPreviewLocalAdmin({ ...local, hostname }), false, hostname);
});
test("Telegram Mini App launches still require verified admin permissions in development", () => {
  assert.equal(canPreviewLocalAdmin({ ...local, miniMode: true }), false);
});

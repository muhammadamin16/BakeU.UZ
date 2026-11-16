import test from "node:test";
import assert from "node:assert/strict";
import { canPreviewAdminDemo } from "./adminAccess.js";

const demo = { pathname: "/admin" };
test("ordinary browsers can preview only the existing browser demo routes", () => {
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
  for (const hostname of [
    "localhost",
    "127.0.0.1",
    "::1",
    "[::1]",
    "bake-u-uz-self.vercel.app",
    "www.bakeu.uz",
  ])
    for (const pathname of paths)
      assert.equal(
        canPreviewAdminDemo({ ...demo, hostname, pathname }),
        true,
        hostname + pathname,
      );
});
test("the server-backed Telegram route and unknown routes never get demo preview access", () => {
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
    assert.equal(canPreviewAdminDemo({ ...demo, pathname }), false, pathname);
});
test("the deployed production site can show browser-only demo data without granting server permissions", () => {
  for (const hostname of ["bake-u-uz-self.vercel.app", "bakeu.uz", "127.0.0.1"])
    for (const development of [false, true]) {
      assert.equal(
        canPreviewAdminDemo({ ...demo, hostname, development }),
        true,
      );
      assert.equal(
        canPreviewAdminDemo({
          pathname: "/admin/telegram",
          hostname,
          development,
        }),
        false,
      );
    }
});
test("Telegram Mini App launches still require verified admin permissions for demo routes", () => {
  assert.equal(canPreviewAdminDemo({ ...demo, miniMode: true }), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  routeFromAppUrl,
  shareUrl,
  backAction,
  geolocationError,
} from "./navigation.js";
const site = "https://www.bakeu.uz";
test("deep links preserve supported storefront and admin routes, not external URLs", () => {
  assert.equal(
    routeFromAppUrl("bakeu://open/#/product/cake", site),
    "/product/cake",
  );
  assert.equal(
    routeFromAppUrl("bakeu://open/messages?seller=bakeu", site),
    "/messages?seller=bakeu",
  );
  assert.equal(
    routeFromAppUrl(site + "/#/admin/products/P101", site),
    "/admin/products/P101",
  );
  assert.equal(
    routeFromAppUrl(site + "/#/admin/telegram", site),
    "/admin/telegram",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://evil.test/#/admin",
    "bakeu://evil/#/admin",
    "bakeu://open/#/../../admin",
    "bakeu://open/#/unknown",
    "bakeu://open/#/admin/%zz",
  ])
    assert.equal(routeFromAppUrl(url, site), null, url);
});
test("shared shop links use the public site, not the private WebView origin", () => {
  assert.equal(
    shareUrl("capacitor://localhost/#/profile?shop=bakeu", site),
    site + "/#/profile?shop=bakeu",
  );
  assert.throws(() => shareUrl("https://localhost/#/", "http://public.test"));
});
test("Android back restores history, falls back home, or minimizes at the root", () => {
  assert.equal(backAction("#/cart", true), "back");
  assert.equal(backAction("#/orders/O1", false), "home");
  assert.equal(backAction("#/", true), "minimize");
});
test("native location denial stays denial, rather than requesting an IP fallback", () => {
  for (const code of [
    "OS-PLUG-GLOC-0003",
    "OS-PLUG-GLOC-0008",
    "OS-PLUG-GLOC-0009",
  ])
    assert.equal(geolocationError({ code }).code, 1);
  assert.equal(geolocationError({ code: "OS-PLUG-GLOC-0010" }).code, 3);
  assert.equal(geolocationError({ code: "OS-PLUG-GLOC-0007" }).code, 2);
});

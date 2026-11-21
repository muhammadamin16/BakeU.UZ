import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { request as proxyRequest } from "node:http";
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.BAKEU_PLAYWRIGHT_MODULE || "playwright");

const temp = process.env.BAKEU_TEST_TLS_DIR;
if (!temp) throw Error("Set BAKEU_TEST_TLS_DIR to the directory containing localhost key.pem and cert.pem.");
const origin = "https://localhost:18675";
const api = "http://127.0.0.1:18674/api";
const password = "only-local-test-password";
const server = createServer({ key: readFileSync(temp + "/key.pem"), cert: readFileSync(temp + "/cert.pem") }, (req, res) => {
  const port = req.url.startsWith("/api/") ? 18674 : 18676;
  const upstream = proxyRequest({ hostname: "127.0.0.1", port, path: req.url, method: req.method, headers: req.headers }, (from) => {
    res.writeHead(from.statusCode, from.headers);
    from.pipe(res);
  });
  upstream.on("error", () => { res.writeHead(502); res.end(); });
  req.pipe(upstream);
});
await new Promise((resolve) => server.listen(18675, "127.0.0.1", resolve));
async function request(path, method, body, token, key) {
  const result = await fetch(api + path, {
    method, body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }), ...(key && { "Idempotency-Key": key }) },
  });
  return [result.status, await result.json()];
}
function mongo(code) {
  return execFileSync(process.env.BAKEU_TEST_MONGOSH || "mongosh", ["--quiet", "--port", "18673", "--eval", code], { encoding: "utf8" }).trim();
}
let browser;
try {
  const sign = async (role, phone) => {
    const [status, data] = await request("/auth/signup", "POST", { email: role + "@test.invalid", password, name: role, role, phone });
    assert.equal(status, 201);
    return data;
  };
  const seller = await sign("seller", "+998901234566");
  const buyer = await sign("customer", "+998901234567");
  mongo('db.getSiblingDB("bakeu_unified_browser").markets.insertOne({_id:"release-shop",sellerId:' + JSON.stringify(seller.user.uid) + ',name:"Release Bakery",status:"approved",fulfillment:"pickup"})');
  const [status, product] = await request("/products", "POST", { title: "Release Cake", price: 10000, available: true, variants: [{ name: "Small", price: 25000 }, { name: "Large", price: 50000 }] }, seller.token);
  assert.equal(status, 201);
  const bad = await fetch(api + "/auth/refresh", { method: "POST", headers: { Origin: "https://other.invalid", "X-BakeU-Session": "browser" } });
  assert.equal(bad.status, 403);
  browser = await chromium.launch({ executablePath: process.env.BAKEU_TEST_CHROMIUM, args: ["--no-sandbox"] });
  async function enter(page, context) {
    context ||= await browser.newContext({ ignoreHTTPSErrors: true });
    page ||= await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin + "/#/cart");
    await page.getByLabel("Email").fill("customer@test.invalid");
    await page.getByLabel("Пароль").fill(password);
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Количество: Release Cake · Large" }).waitFor();
    const cookie = (await context.cookies()).find((item) => item.name === "__Host-bakeu-refresh");
    assert.ok(cookie?.httpOnly && cookie.secure && cookie.sameSite === "Strict");
    return page;
  }
  const guest = await browser.newContext({ignoreHTTPSErrors:true});
  const guestPage = await guest.newPage();
  guestPage.setDefaultTimeout(15000);
  await guestPage.goto(origin + "/#/product/" + product.id);
  await guestPage.getByRole("heading", {name:"Release Cake"}).waitFor();
  await guestPage.getByLabel("Вариант").selectOption({label:"Small"});
  await guestPage.getByRole("button", {name:"Добавить в корзину"}).click();
  await guestPage.getByText("Товар сохранён в гостевой корзине.").waitFor();
  await guestPage.goto(origin + "/#/cart");
  await guestPage.getByText("Release Cake · Small × 1").waitFor();
  const first = await enter(guestPage,guest);
  const imported = first.waitForResponse((r)=>r.url().endsWith("/cart/items") && r.request().method()==="POST");
  await first.getByRole("button",{name:"Добавить доступные позиции из гостевой корзины"}).click();
  assert.equal((await imported).status(),200);
  await first.getByText(/Добавлено: 1/).waitFor();
  assert.equal(await first.evaluate(()=>Object.values(JSON.parse(localStorage.getItem("bakeu-cart")).state.items)[0]),1);
  await first.reload();
  await first.getByRole("spinbutton", { name: "Количество: Release Cake · Large" }).waitFor();
  for (const [name, qty] of [["Small", "2"], ["Large", "1"]]) {
    const row = first.locator(".tg-orders-line").filter({ has: first.getByRole("spinbutton", { name: "Количество: Release Cake · " + name }) });
    await row.getByRole("spinbutton").fill(qty);
    const response = first.waitForResponse((r) => r.url().endsWith("/cart/items") && r.request().method() === "POST");
    await row.getByRole("button", { name: "Сохранить в корзине" }).click();
    assert.equal((await response).status(), 200);
  }
  const second = await enter();
  await second.getByRole("button", { name: "Загрузить в оформление" }).click();
  assert.equal(await second.getByRole("spinbutton", { name: "Количество: Release Cake · Small" }).inputValue(), "2");
  assert.equal(await second.getByRole("spinbutton", { name: "Количество: Release Cake · Large" }).inputValue(), "1");
  await second.getByLabel("Дата (Ташкент)").fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  await second.getByLabel("Время", { exact: true }).fill("12:00");
  const orderResponse = second.waitForResponse((r) => r.url().endsWith("/api/orders") && r.request().method() === "POST");
  await second.getByRole("button", { name: "Оформить заказ", exact: true }).click();
  const saved = await orderResponse;
  assert.equal(saved.status(), 201);
  const { orders: [order] } = await saved.json();
  assert.equal(order.total, 100000);
  assert.equal(order.items.length, 2);
  await second.getByText(/Заказ сохранён/).waitFor();
  const [change, updated] = await request("/orders/" + order.id + "/status", "PATCH", { status: "accepted", expectedStatus: "pending", expectedVersion: order.version }, seller.token, "release-accept");
  assert.equal(change, 200, JSON.stringify(updated));
  const [historyStatus, history] = await request("/orders", "GET", undefined, buyer.token);
  assert.equal(historyStatus, 200);
  assert.deepEqual(history.placed[0].history.map((item) => item.status), ["pending", "accepted"]);
  await second.goto(origin + "/#/orders/" + order.id);
  await second.waitForURL((url)=>url.hash.includes("order="+order.id));
  await second.getByRole("heading", { name: /Заказ #/ }).first().waitFor();
  await second.goto(origin + "/#/profile");
  await second.waitForURL((url)=>url.hash==="#/account/orders");
  await second.goto(origin + "/#/checkout");
  await second.waitForURL((url)=>url.hash==="#/account/orders");
  console.log("PASS guest product → guest cart → signed-in import preserving source, canonical routes, HTTPS Chromium: Secure HttpOnly SameSite=Strict, CSRF rejection, reload, two browsers, two variants, checkout, status history");
} finally {
  await browser?.close();
  server.close();
}

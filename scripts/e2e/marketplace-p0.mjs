// Isolated cross-repository browser test. No Railway/deployment credentials or
// existing database names are accepted. See docs/production/MARKETPLACE_P0.md.
import assert from 'node:assert/strict';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:https';
import { createServer as createPortGuard } from 'node:net';
import { createWriteStream } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { chromium } from 'playwright';
import { createWebsiteHandler, readWebsiteConfig, validateWebsiteBuild } from '../website-server.mjs';
import { createOrdersApi } from '../../src/bot/orders/api.js';
import { createUpdateHandler } from '../../src/bot/handlers/router.js';
import { createApiServer } from '../../src/bot/services/httpServer.js';
import { setup, mockTelegram, message } from '../../src/bot/tests/helpers.js';

const origin = 'https://127.0.0.1:18884', base = 'http://127.0.0.1:18881';
const bridgeToken = 'local-test-telegram-bridge-secret-at-least32';
const botToken = '12345:test-bot-token-never-real-abcdefghijklmnop';
const out = resolve(process.env.BAKEU_P0_EVIDENCE_DIR || 'test-results/p0');
const mongoURI = process.env.BAKEU_P0_MONGO_URI;
const binary = process.env.BAKEU_P0_SERVER_BINARY;
assert.ok(mongoURI?.startsWith('mongodb://127.0.0.1:') && !new URL(mongoURI).username, 'Use only a new disposable loopback Mongo replica set, never a tunnel.');
assert.ok(binary && resolve(binary) === binary, 'Set BAKEU_P0_SERVER_BINARY to an absolute Go test binary path.');
assert.ok(process.env.BAKEU_P0_TLS_KEY && process.env.BAKEU_P0_TLS_CERT, 'Generate a local test TLS key/certificate.');
await mkdir(out, { recursive: true });
const log = createWriteStream(join(out, 'go-browser-server.log'));
const profile = await mkdtemp(join(tmpdir(), 'bakeu-p0-browser-'));
const database = 'bakeu_p0_browser_staging_test_' + randomUUID().replaceAll('-', '');
let child, startError, gateway, bot, fixture, stage = 'fixture', browser;
const contexts = new Set(), browserErrors = [];

async function startGo() {
  // Refuse an occupied port before starting any fixture requests. Never attach
  // to another local service just because it happens to answer /readyz.
  const guard = createPortGuard(); await listen(guard, 18881); await closeServer(guard);
  startError = null;
  child = spawn(binary, [], { env: {
    PATH: process.env.PATH, PORT: '18881', MONGODB_URI: mongoURI, MONGODB_DB: database,
    JWT_SECRET: 'p0-local-test-jwt-never-production-with-32-characters',
    AUTH_PHONE_ACCOUNTS: 'true', AUTH_REFRESH_SESSIONS: 'true', SELLER_SELF_SERVICE: 'true',
    TELEGRAM_BOT_USERNAME: 'BakeUuzBot', TELEGRAM_BRIDGE_TOKEN: bridgeToken,
    TELEGRAM_SITE_URL: origin, APP_BASE_URL: origin,
    AUTH_BROWSER_ORIGINS: origin + ',https://phone-contract.test',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.on('error', error => { startError = error; });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  for (let i = 0; i < 80; i++) {
    if (startError) throw startError;
    if (child.exitCode !== null) throw Error('Owned Go test process failed; inspect go-browser-server.log.');
    try { if ((await fetch(base + '/readyz')).status === 200) return; } catch { /* Startup only. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Owned Go test process did not become ready.');
}
async function stopGo() {
  if (child?.pid && child.exitCode === null && child.signalCode === null) {
    const closed = once(child, 'exit'); child.kill('SIGTERM'); await closed;
  }
}
const listen = (server, port) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
async function closeServer(server) { if (server?.listening) await new Promise(resolve => server.close(resolve)); }
const launch = { headless: true, ...(process.env.BAKEU_P0_CHROMIUM_PATH ? { executablePath: process.env.BAKEU_P0_CHROMIUM_PATH } : {}), args: ['--no-sandbox'] };
const view = { ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, geolocation: { latitude: 41.31, longitude: 69.28 }, permissions: ['geolocation'] };
async function prepare(context) {
  contexts.add(context);
  await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  context.on('page', page => page.on('pageerror', error => browserErrors.push(error.message)));
  return context;
}
function signedLaunch(actor) {
  const data = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: randomUUID(), user: JSON.stringify({ id: actor, first_name: 'P0 Telegram' }) });
  const check = [...data].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => key + '=' + value).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  data.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return data.toString();
}
async function api(user, method, path, body, want = 200) {
  const response = await fetch(base + '/api' + path, { method, headers: {
    'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token,
    'X-BakeU-Account': user.uid, 'Idempotency-Key': 'p0-browser-' + randomUUID(),
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, want, method + ' ' + path);
  return want === 204 ? null : response.json();
}
try {
  await startGo();
  const diagnostic = await fetch(base + '/api/integrations/telegram/diagnostics', { headers: { Authorization: 'Bearer ' + bridgeToken } });
  assert.equal(diagnostic.status, 200); assert.equal((await diagnostic.json()).phoneAccounts, true);
  assert.deepEqual(await (await fetch(base + '/api/products')).json(), []);
  fixture = setup(); fixture.config = { ...fixture.config, token: botToken, adminIds: [], origins: [origin], siteUrl: origin, miniAppUrl: origin };
  const bridge = createOrdersApi({ enabled: true, accountsEnabled: true, baseUrl: base, token: bridgeToken });
  const telegram = mockTelegram(), handle = createUpdateHandler({ ...fixture, telegram, phoneAccounts: bridge });
  bot = createApiServer({ ...fixture, ordersSettings: { enabled: true, accountsEnabled: true, baseUrl: base, token: bridgeToken } });
  await listen(bot, 0);
  assert.equal((await fetch('http://127.0.0.1:' + bot.address().port + '/health')).status, 200);
  const config = readWebsiteConfig({ WEB_ACCOUNTS_MODE: 'go', WEB_GO_API_URL: base, WEB_BOT_API_URL: 'http://127.0.0.1:' + bot.address().port, WEB_DIST_DIR: resolve('dist'), WEB_ALLOWED_ORIGINS: origin });
  await validateWebsiteBuild(config);
  gateway = createServer({ key: await readFile(process.env.BAKEU_P0_TLS_KEY), cert: await readFile(process.env.BAKEU_P0_TLS_CERT) }, createWebsiteHandler(config));
  await listen(gateway, 18884);
  stage = 'cross_repository_phone_contract';
  const contract = await promisify(execFile)(process.execPath, ['scripts/check-phone-auth-contract.mjs'], {
    env: { ...process.env, BAKEU_PHONE_CONTRACT_GO_URL: base }, timeout: 30000,
  });
  await writeFile(join(out, 'phone-contract.log'), contract.stdout);
  assert.equal(JSON.parse(contract.stdout.trim()).ok, true);
  browser = await chromium.launch(launch);
  let persistent = await prepare(await chromium.launchPersistentContext(profile, { ...launch, ...view }));
  async function proof(id, phone, actor) {
    await handle(message(actor, '/start goauth_' + id));
    await handle({ message: { chat: { id: actor, type: 'private' }, from: { id: actor }, contact: { user_id: actor, phone_number: phone } } });
    const code = telegram.messages.at(-1).text.match(/Код BakeU: (\d{6})/)?.[1]; assert.ok(code); return code;
  }
  async function register(role, context) {
    stage = role + '_registration'; const page = await context.newPage();
    const phone = '+99890' + randomInt(1000000, 9999999), actor = randomInt(100000000, 999999999);
    await page.goto(origin + '/#/register');
    await page.getByRole('combobox').selectOption(role); await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
    assert.equal(await page.locator('input[type="email"],input[type="password"]').count(), 0);
    await page.getByLabel('Имя', { exact: true }).fill('P0'); await page.getByLabel('Фамилия', { exact: true }).fill('Fixture');
    await page.getByLabel('Номер телефона без кода +998', { exact: true }).fill(phone);
    if (role === 'seller') {
      await page.getByLabel('Название магазина', { exact: true }).fill('P0 verified bakery');
      await page.getByLabel('Адрес магазина', { exact: true }).fill('Tashkent fixture address');
      await page.getByRole('button', { name: 'Получить код в Telegram', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Выберите точку магазина на карте.' }).waitFor();
      await page.getByRole('button', { name: 'Выбрать на карте', exact: true }).click();
      await page.locator('.leaflet-container').click({ position: { x: 120, y: 100 } });
      await page.getByText('Точка выбрана', { exact: false }).waitFor();
      await page.getByLabel('Адрес магазина', { exact: true }).fill('Tashkent fixture address 2');
      assert.equal(await page.getByText('Точка выбрана', { exact: false }).count(), 0);
      await page.locator('.leaflet-container').click({ position: { x: 130, y: 105 } });
    }
    const startedWait = page.waitForResponse(r => r.url().endsWith('/auth/phone/start') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Получить код в Telegram', exact: true }).click();
    const started = await startedWait; assert.equal(started.status(), 201);
    const pending = await started.json(), payload = started.request().postDataJSON();
    assert.equal(payload.email, undefined); assert.equal(payload.password, undefined); assert.equal(payload.firstName, 'P0');
    await page.reload(); await page.getByLabel('Код из Telegram', { exact: true }).fill(await proof(pending.id, phone, actor));
    const verifiedWait = page.waitForResponse(r => r.url().endsWith('/auth/phone/verify') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Подтвердить и войти', exact: true }).click();
    const verified = await verifiedWait; assert.equal(verified.status(), 200); const data = await verified.json();
    await page.getByRole('button', { name: 'Выйти', exact: true }).waitFor();
    const user = { page, context, phone, actor, uid: data.user.uid, token: data.token };
    const me = await api(user, 'GET', '/me'); assert.equal(me.uid, user.uid);
    if (role === 'seller') {
      assert.equal(me.market.status, 'approved'); assert.equal(me.market.sellerId, user.uid);
      assert.equal(me.market.address, payload.address); assert.equal(me.market.lat, payload.lat); assert.equal(me.market.lng, payload.lng);
    }
    return user;
  }
  const buyer = await register('customer', persistent);
  const seller = await register('seller', await prepare(await browser.newContext(view)));
  stage = 'product_create_edit_upload';
  const page = seller.page, title = 'P0 bread ' + Date.now();
  await page.getByLabel('Название', { exact: true }).fill(title); await page.getByLabel('Цена', { exact: true }).fill('10000');
  const createWait = page.waitForResponse(r => r.url().endsWith('/api/products') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Сохранить товар', exact: true }).click();
  const created = await createWait; assert.equal(created.status(), 201); const product = await created.json();
  await page.getByLabel('Название', { exact: true }).fill(title + ' edited');
  await page.getByLabel('Цена', { exact: true }).fill('12000');
  const editWait = page.waitForResponse(r => r.url().endsWith('/api/products/' + product.id) && r.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Сохранить товар', exact: true }).click(); assert.equal((await editWait).status(), 200);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN0AAAAASUVORK5CYII=', 'base64');
  const uploadWait = page.waitForResponse(r => r.url().endsWith('/api/products/' + product.id + '/image') && r.request().method() === 'POST');
  await page.getByLabel('Загрузить фото', { exact: true }).setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: png });
  const uploaded = await uploadWait; assert.equal(uploaded.status(), 200); const imageURL = (await uploaded.json()).imageURLs[0];
  const imageResponse = await fetch(base + imageURL); assert.equal(imageResponse.status, 200); assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), png);
  await page.reload(); await page.getByRole('button', { name: title + ' edited', exact: true }).waitFor();
  assert.equal((await api(seller, 'GET', '/products/' + product.id)).price, 12000);
  stage = 'order_and_archive';
  const receipt = await api(buyer, 'POST', '/orders', { items: [{ productId: product.id, qty: 1 }], fulfillment: 'pickup', scheduledAt: new Date(Date.now() + 86400000).toISOString() }, 201);
  const order = receipt.orders[0]; assert.equal(order.total, 12000);
  await page.getByRole('button', { name: 'Удалить товар: ' + title + ' edited', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить удаление', exact: true }).click();
  await page.getByText('Товар удалён из каталога. Данные и история заказов сохранены.', { exact: true }).waitFor();
  await page.reload(); assert.equal(await page.getByRole('button', { name: title + ' edited', exact: true }).count(), 0);
  const after = await api(buyer, 'GET', '/orders'); assert.equal(after.placed.find(o => o.id === order.id).total, order.total);
  assert.equal((await fetch(base + imageURL)).status, 200);
  // Transitions remain possible for an existing order whose listing was archived.
  await api(seller, 'PATCH', '/orders/' + order.id + '/status', { status: 'accepted', expectedStatus: order.status, expectedVersion: order.version });
  assert.equal((await api(seller, 'GET', '/seller/dashboard')).activeOrders.total, 1);
  stage = 'shop_map_edit';
  await page.getByLabel('Адрес магазина', { exact: true }).fill('Tashkent updated fixture address');
  await page.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await page.getByText('Точка выбрана', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click();
  await page.getByText('Настройки сохранены.', { exact: true }).waitFor();
  const shop = (await api(seller, 'GET', '/me')).market; assert.equal(shop.lat, 41.31); assert.equal(shop.lng, 69.28);
  stage = 'browser_close_and_backend_restart';
  const cookie = (await persistent.cookies()).find(c => c.name === '__Host-bakeu-refresh');
  assert.ok(cookie?.httpOnly && cookie.secure && cookie.expires > Date.now() / 1000);
  contexts.delete(persistent); await persistent.close(); await stopGo(); await startGo();
  persistent = await prepare(await chromium.launchPersistentContext(profile, { ...launch, ...view }));
  const reopened = await persistent.newPage(); const refreshWait = reopened.waitForResponse(r => r.url().endsWith('/auth/refresh'));
  const meWait = reopened.waitForResponse(r => r.url().endsWith('/api/me'));
  await reopened.goto(origin + '/#/profile'); assert.equal((await refreshWait).status(), 200);
  await reopened.getByRole('button', { name: 'Выйти', exact: true }).waitFor();
  // Fresh page JS has no access token; same-UID /me proves the persisted cookie restored it.
  const restored = await meWait; assert.equal(restored.status(), 200); assert.equal((await restored.json()).uid, buyer.uid);
  await reopened.screenshot({ path: join(out, 'buyer-reopened.png'), fullPage: true });
  stage = 'miniapp_shared_go_identity';
  const miniContext = await prepare(await browser.newContext(view)); const initData = signedLaunch(buyer.actor);
  await miniContext.addInitScript(raw => { window.Telegram = { WebApp: { initData: raw, ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {} } }; }, initData);
  const mini = await miniContext.newPage(); const exchangeWait = mini.waitForResponse(r => r.url().endsWith('/auth/phone/telegram'));
  await mini.goto(origin + '/?miniapp=1#/miniapp'); const exchange = await exchangeWait; assert.equal(exchange.status(), 200); assert.equal((await exchange.json()).user.uid, buyer.uid);
  await mini.goto(origin + '/?miniapp=1#/profile'); await mini.getByRole('button', { name: 'Выйти', exact: true }).waitFor();
  await mini.reload(); await mini.getByRole('button', { name: 'Выйти', exact: true }).waitFor();
  stage = 'demo_disclosure';
  const admin = await (await prepare(await browser.newContext(view))).newPage();
  await admin.goto(origin + '/#/admin/customers');
  await admin.getByText('Эти списки и изменения хранятся только в этом браузере и не являются данными MongoDB.', { exact: false }).waitFor();
  await admin.screenshot({ path: join(out, 'admin-demo-labelled.png'), fullPage: true });
  assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM users').get().n, 0);
  assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM miniapp_sessions').get().n, 0);
  assert.deepEqual(browserErrors, []);
  console.log(JSON.stringify({ ok: true, source: 'new_isolated_local_fixture', database, buyerSellerPhoneOnly: true, mapClickAndGPS: true, addressEditRequiresNewPoint: true, pendingReload: true, sellerApprovedWithoutApplication: true, productCreateEditImageArchiveViaUI: true, gridfsRoundTrip: true, historicalOrdersRetained: true, activeAcceptedOrderCount: true, browserCloseAndBackendRestartSameUID: true, websiteMiniAppSameGoUID: true, demoAdminExplicitlyLabelled: true, sqliteAccountsCreated: 0, realTelegramNetworkCalled: false, productionTouched: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, stage, message: error.message, productionTouched: false })); process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close();
  await browser?.close(); await closeServer(gateway); await closeServer(bot); fixture?.db.close();
  await stopGo(); log.end(); await rm(profile, { recursive: true });
}

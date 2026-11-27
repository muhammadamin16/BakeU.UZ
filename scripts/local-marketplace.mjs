import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { createWebsiteHandler, readWebsiteConfig, validateWebsiteBuild } from "./website-server.mjs";

const site = fileURLToPath(new URL("../", import.meta.url));
const backend = resolve(site, "../BakeU-Backend");
const state = resolve(site, ".bakeu-local");
const dist = resolve(state, "dist");
const keysPath = resolve(state, "keys.json");
const web = "http://localhost:38118";
const api = "http://127.0.0.1:38119";
const dbName = "bakeu_laptop_test";
const mongoURI = "mongodb://127.0.0.1:37117/?directConnection=true";
const replica = "bakeuLaptopLocal";
const composeArgs = ["compose", "--project-name", "bakeu-laptop-local", "-f", resolve(site, "compose.local.yaml")];
const fixtureBot = "BakeULaptopFixtureBot";
const fixture = [
  { role: "customer", firstName: "Local", lastName: "Admin" },
  { role: "customer", firstName: "Local", lastName: "Buyer One" },
  { role: "customer", firstName: "Local", lastName: "Buyer Two" },
  { role: "seller", firstName: "Local", lastName: "Seller One", marketName: "Local Tashkent Bakery", address: "Local Chilonzor", lat: 41.28, lng: 69.21 },
  { role: "seller", firstName: "Local", lastName: "Seller Two", marketName: "Local Bread Studio", address: "Local Yunusobod", lat: 41.36, lng: 69.29 },
].map((account, i) => ({ ...account, phone: "+99800000000" + (i + 1), actor: String(999900001 + i) }));
const requireBackend = createRequire(resolve(backend, "package.json"));

function processFor(command, args, cwd, env = process.env) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit", windowsHide: true });
  const result = new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", code => resolveExit(code));
  });
  result.catch(() => {});
  return { child, result };
}
async function run(command, args, cwd = site, env) {
  const { result } = processFor(command, args, cwd, env);
  if (await result !== 0) throw Error(`Command failed: ${command} ${args[0]}`);
}
async function keys(create = false) {
  if (create) {
    await mkdir(state, { recursive: true });
    const generated = { jwt: randomBytes(48).toString("hex"), bridge: randomBytes(48).toString("hex") };
    await writeFile(keysPath, JSON.stringify(generated), { flag: "wx", mode: 0o600 }).catch(error => {
      if (error.code !== "EEXIST") throw error;
    });
  }
  const values = JSON.parse(await readFile(keysPath, "utf8"));
  if (!/^[a-f0-9]{96}$/.test(values.jwt) || !/^[a-f0-9]{96}$/.test(values.bridge)) throw Error("Invalid local key file");
  return values;
}
async function localDb(work) {
  const { MongoClient } = requireBackend("mongodb");
  const client = new MongoClient(mongoURI, { serverSelectionTimeoutMS: 4000 });
  try {
    const db = client.db(dbName);
    const hello = await db.command({ hello: 1 });
    if (hello.setName !== replica || !hello.isWritablePrimary) throw Error("Expected the dedicated local replica set");
    return await work(db);
  } finally {
    await client.close();
  }
}
async function post(route, body, headers) {
  const response = await fetch(api + "/api" + route, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
    redirect: "error", signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw Error(`Local API ${route} returned HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}
function contact(id, account, secret) {
  return post("/integrations/telegram/auth/phone/contact", { id, phone: account.phone }, {
    Authorization: "Bearer " + secret, "X-Telegram-User-Id": account.actor,
  });
}
async function fixtureAccount(db, account) {
  const binding = await db.collection("telegram_bindings").findOne({ _id: account.actor });
  const user = await db.collection("users").findOne({ verifiedPhoneE164: account.phone });
  if (!binding && !user) return null;
  if (!binding || !user || binding.userId !== user._id || user.role !== account.role) throw Error("Local fixture identity conflict");
  return user;
}
async function seed(db, secret) {
  const users = [];
  for (const account of fixture) {
    let user = await fixtureAccount(db, account);
    if (!user) {
      const mode = { "X-BakeU-Session": "refresh" };
      const { actor, ...draft } = account;
      const challenge = await post("/auth/phone/start", { ...draft, purpose: "register" }, mode);
      const { code } = await contact(challenge.id, account, secret);
      const session = await post("/auth/phone/verify", { id: challenge.id, code }, mode);
      await post("/auth/logout", { refreshToken: session.refreshToken }, mode);
      user = await fixtureAccount(db, account);
    }
    users.push(user);
  }
  const shops = await Promise.all(users.slice(3).map(seller => db.collection("markets").findOne({ sellerId: seller._id })));
  if (shops.some(shop => !shop)) throw Error("Fixture store missing");
  const { GridFSBucket, ObjectId } = requireBackend("mongodb");
  const bucket = new GridFSBucket(db);
  const insertOnce = (collection, id, fields) =>
    db.collection(collection).updateOne({ _id: id }, { $setOnInsert: fields }, { upsert: true });
  const now = new Date();
  const products = [
    { title: "Local Honey Cake", price: 74000, photos: ["cake.jpg", "cookie.jpg", "bread.jpg"] },
    { title: "Local Bakery Bread", price: 18000, photos: ["bread.jpg", "bread-crust.webp", "bread-crumb.webp"] },
  ];
  for (const [index, product] of products.entries()) {
    const productId = "local-product-" + (index + 1);
    if (await db.collection("products").findOne({ _id: productId })) continue;
    const imageURLs = [];
    for (const photo of product.photos) {
      const imageId = new ObjectId(createHash("sha256").update(productId + "/" + photo).digest("hex").slice(0, 24));
      if (!(await bucket.find({ _id: imageId }).hasNext())) {
        const bytes = await readFile(resolve(site, "public/images/products", photo));
        await pipeline(Readable.from([bytes]), bucket.openUploadStreamWithId(imageId, photo, {
          metadata: { contentType: photo.endsWith(".webp") ? "image/webp" : "image/jpeg", visibility: "product", productId },
        }));
      }
      imageURLs.push("/api/images/" + imageId.toHexString());
    }
    const { title, price } = product;
    await insertOnce("products", productId, { title, price, imageURLs, category: "Выпечка", description: "LOCAL TEST",
      sellerId: users[index + 3]._id, available: true, draft: false, revision: 1, createdAt: now, updatedAt: now });
  }
  const statuses = ["pending", "accepted", "preparing", "completed", "cancelled"];
  for (const [i, status] of statuses.entries()) {
    const index = i % 2;
    const { title, price } = products[index];
    const buyer = users[index + 1];
    const seller = users[index + 3];
    const shop = shops[index];
    await insertOnce("orders", "local-order-" + (i + 1), {
      number: "LOCAL-" + (i + 1), customerId: buyer._id, buyerName: buyer.name, buyerPhone: buyer.phone,
      sellerId: seller._id, shopId: shop._id, shopName: shop.name, fulfillment: "pickup",
      items: [{ productId: "local-product-" + (index + 1), title, price, qty: 1 }], total: price, status,
      workflowVersion: 2, version: 1, history: [{ status, at: now, actorId: seller._id, version: 1 }],
      createdAt: now, updatedAt: now, scheduledAt: new Date(now.getTime() + 86400000),
    });
  }
  await insertOnce("billing_plans", "local-plan", { name: "Local sample plan", amount: 0, currency: "UZS", active: false });
  await insertOnce("subscriptions", "local-subscription", { userId: users[3]._id, planId: "local-plan", status: "pending", createdAt: now });
  await insertOnce("notifications", "local-notification", { userId: users[1]._id, title: "Local test notice", createdAt: now });
  await insertOnce("complaints", "a".repeat(64), { userId: users[1]._id, orderId: "local-order-1", subject: "Local test complaint", status: "open", createdAt: now });
  console.log("LOCAL TEST fixtures ready. Existing records were preserved.");
}

async function serveWebsite() {
  const config = readWebsiteConfig({ WEB_ACCOUNTS_MODE: "go", WEB_GO_API_URL: api, WEB_BOT_API_URL: api,
    WEB_ALLOWED_ORIGINS: web, WEB_DIST_DIR: dist });
  await validateWebsiteBuild(config);
  const server = createServer({ requestTimeout: 45000, headersTimeout: 10000 }, createWebsiteHandler(config));
  await new Promise((resolveListening, reject) => server.once("error", reject).listen(38118, "localhost", resolveListening));
  return server;
}

async function stopBackend(child) {
  if (child && child.child.exitCode === null && child.child.signalCode === null) {
    child.child.kill();
    await child.result;
  }
}

async function start(seedRequested) {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw Error("Use Node.js 24 LTS");
  const tsc = resolve(backend, "node_modules/typescript/bin/tsc");
  const vite = resolve(site, "node_modules/vite/bin/vite.js");
  if (!existsSync(tsc) || !existsSync(vite)) throw Error("Run npm ci in both sibling repositories first");
  const secret = await keys(true);
  await run("docker", [...composeArgs, "up", "-d", "--wait", "--wait-timeout", "120"]);
  await run(process.execPath, [tsc], backend);
  await run(process.execPath, [vite, "build", "--outDir", dist, "--emptyOutDir"], site, {
    ...process.env, VITE_GO_API_URL: "/api", VITE_ACCOUNT_API_URL: "/api", VITE_GO_PHONE_ACCOUNTS: "true",
    VITE_BAKEU_LOCAL_TEST: "true", VITE_GO_BACKEND_URL: "/api",
    VITE_GO_BROWSER_SESSIONS: "true", VITE_GO_LOCAL_ACCOUNTS: "false", VITE_TELEGRAM_BOT_USERNAME: "",
  });
  const launch = adminId => processFor(process.execPath, ["dist/main.js"], backend, {
    ...process.env, BAKEU_BIND_LOOPBACK: "true", PORT: "38119", NODE_ENV: "development", MONGODB_URI: mongoURI,
    MONGODB_DB: dbName, JWT_SECRET: secret.jwt, TELEGRAM_BRIDGE_TOKEN: secret.bridge,
    TELEGRAM_BOT_USERNAME: fixtureBot, AUTH_BROWSER_ORIGINS: web, ADMIN_USER_IDS: adminId || "",
  });
  let service;
  let gateway;
  const shutdown = async () => {
    gateway?.closeAllConnections();
    gateway?.close();
    await stopBackend(service);
  };
  const signal = () => { void shutdown().finally(() => process.exit(0)); };
  process.once("SIGINT", signal);
  process.once("SIGTERM", signal);
  async function ready() {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (service.child.exitCode !== null || service.child.signalCode !== null) throw Error("Backend stopped before readiness");
      try {
        if ((await fetch(api + "/readyz", { signal: AbortSignal.timeout(1000) })).ok) return;
      } catch {}
      await sleep(250);
    }
    throw Error("Backend did not become ready");
  }
  try {
    const admin = await localDb(db => fixtureAccount(db, fixture[0]));
    service = launch(admin?._id);
    await ready();
    if (seedRequested) {
      await localDb(db => seed(db, secret.bridge));
      if (!admin) {
        await stopBackend(service);
        const seeded = await localDb(db => fixtureAccount(db, fixture[0]));
        service = launch(seeded._id);
        await ready();
      }
    }
    gateway = await serveWebsite();
    console.log(`LOCAL TEST: ${web} | Admin: ${web}/#/admin | Admin phone: ${fixture[0].phone}`);
    console.log("Ctrl+C stops Website and Backend. npm run local:stop stops MongoDB and keeps its data.");
    if (await service.result !== 0) throw Error("Backend stopped");
  } finally {
    process.removeListener("SIGINT", signal);
    process.removeListener("SIGTERM", signal);
    await shutdown();
  }
}

const [command, option, ...extra] = process.argv.slice(2);
try {
  if (command === "start" && !extra.length && [undefined, "--seed"].includes(option)) await start(option === "--seed");
  else if (command === "stop" && option === undefined) await run("docker", [...composeArgs, "stop"]);
  else if (command === "proof" && !extra.length && /^[a-f0-9]{48}$/.test(option ?? "")) {
    const secret = await keys();
    const account = await localDb(async db => {
      const proof = await db.collection("phone_proofs").findOne({ _id: option, purpose: "login", used: { $ne: true }, expiresAt: { $gt: new Date() } });
      const result = fixture.find(candidate => candidate.phone === proof?.phone);
      if (!result || !await fixtureAccount(db, result)) throw Error("Challenge is not for a seeded local test account");
      return result;
    });
    const { code } = await contact(option, account, secret.bridge);
    console.log("LOCAL TEST one-time code:", code);
  } else throw Error("Use local:start [--seed], local:proof -- <challenge ID>, or local:stop");
} catch (error) {
  console.error("LOCAL TEST:", error.message);
  process.exitCode = 1;
}

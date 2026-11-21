import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { apiDestination, createWebsiteHandler, readWebsiteConfig, validateWebsiteBuild } from "./website-server.mjs";
import { publicBuildMetadata } from "./build-metadata.mjs";

test("website routes explicit Go sessions without confusing legacy login or exposing the service bridge", () => {
  assert.equal(apiDestination("/api/auth/login", {}, "legacy"), "bot");
  assert.equal(apiDestination("/api/auth/login", { "x-bakeu-session": "browser" }, "legacy"), "go");
  assert.equal(apiDestination("/api/auth/logout", { authorization: "Bearer a.b.c" }, "legacy"), "go");
  assert.equal(apiDestination("/api/auth/login", {}, "go"), "go");
  assert.equal(apiDestination("/api/miniapp/go-session", {}, "go"), "bot");
  assert.equal(apiDestination("/api/integrations/telegram/me", {}, "go"), null);
  assert.equal(apiDestination("/api/unexpected", {}, "go"), null);
  assert.throws(() => readWebsiteConfig({ WEB_GO_API_URL: "https://user:secret@example.test" }));
  assert.throws(() => readWebsiteConfig({ WEB_GO_API_URL: "http://public.example.test" }));
  assert.equal(readWebsiteConfig({ WEB_GO_API_URL: "http://bakeu-backend.railway.internal:8080" }).go, "http://bakeu-backend.railway.internal:8080");
});

test("cutover rejects a stale or cross-site frontend build rather than falling back to SQLite",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"bakeu-build-config-"));const config=readWebsiteConfig({WEB_DIST_DIR:dir,WEB_ACCOUNTS_MODE:"go",WEB_GO_API_URL:"https://go.test",WEB_BOT_API_URL:"https://bot.test",PUBLIC_SITE_URL:"https://bakeu.test"});
  try{
    await assert.rejects(validateWebsiteBuild(config));
    await writeFile(join(dir,"bakeu-build.json"),JSON.stringify(publicBuildMetadata({VITE_GO_PHONE_ACCOUNTS:"false"})));
    await assert.rejects(validateWebsiteBuild(config));
    await writeFile(join(dir,"bakeu-build.json"),JSON.stringify(publicBuildMetadata({VITE_GO_PHONE_ACCOUNTS:"true",VITE_GO_API_URL:"https://other.up.railway.app/api"})));
    await assert.rejects(validateWebsiteBuild(config));
    await writeFile(join(dir,"bakeu-build.json"),JSON.stringify(publicBuildMetadata({VITE_GO_PHONE_ACCOUNTS:"true",VITE_GO_API_URL:"/api"})));
    await validateWebsiteBuild(config);
    await assert.rejects(validateWebsiteBuild({ ...config, mode: "legacy" }), /requires WEB_ACCOUNTS_MODE=go/);
    assert.throws(()=>publicBuildMetadata({VITE_GO_API_URL:"https://user:secret@example.test/api"}));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test("production server preserves Go cookies/methods/multipart and never returns SPA HTML for an API error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bakeu-website-test-"));
  await mkdir(join(dir, "assets")); await writeFile(join(dir, "index.html"), "<html>BakeU</html>");
  await writeFile(join(dir, "assets", "app.js"), "export const ready=true;");
  const calls = [], logs = [];
  const handler = createWebsiteHandler(readWebsiteConfig({ WEB_DIST_DIR: dir, PUBLIC_SITE_URL: "https://bakeu.test", WEB_ACCOUNTS_MODE: "go", WEB_GO_API_URL: "https://go.test", WEB_BOT_API_URL: "https://bot.test" }), {
    log: (value) => logs.push(value),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/products?bad=1")) return Response.json({ error: "invalid product" }, { status: 409 });
      if (url.endsWith("/products?redirect=1")) return new Response(null, { status: 302, headers: { Location: "https://never-follow.test?secret=private" } });
      if (url.endsWith("/products?fail=1")) throw Error("private credential and customer phone must not reach logs");
      return Response.json({ ok: true }, { headers: { "Set-Cookie": "__Host-bakeu-refresh=protected-cookie; Path=/; Secure; HttpOnly; SameSite=Strict" } });
    },
  });
  const server = createServer(handler); await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const auth = await fetch(base + "/api/auth/phone/verify", { method: "POST", headers: { Origin: "https://bakeu.test", "X-BakeU-Session": "browser", "Content-Type": "application/json", Cookie: "__Host-bakeu-refresh=old; other=never-upstream", "X-Telegram-User-Id": "forged" }, body: '{"id":"proof","code":"123456"}' });
    assert.equal(auth.status, 200); assert.match(auth.headers.get("set-cookie"), /HttpOnly/);
    assert.equal(calls[0].url, "https://go.test/api/auth/phone/verify");
    assert.equal(calls[0].init.headers.cookie, "__Host-bakeu-refresh=old");
    assert.equal(calls[0].init.headers["x-telegram-user-id"], undefined);
    assert.equal(calls[0].init.body.toString(), '{"id":"proof","code":"123456"}');
    const image = new FormData(); image.set("image", new Blob(["test photo"], { type: "image/png" }), "cake.png");
    await fetch(base + "/api/products/product/image", { method: "POST", body: image });
    assert.match(calls.at(-1).init.headers["content-type"], /multipart\/form-data; boundary=/);
    assert.ok(calls.at(-1).init.body.includes(Buffer.from("test photo")));
    await fetch(base + "/api/miniapp/go-session", { method: "POST", headers: { Cookie: "__Host-bakeu-refresh=never-send-to-node" }, body: "{}" });
    assert.equal(calls.at(-1).url, "https://bot.test/api/miniapp/go-session"); assert.equal(calls.at(-1).init.headers.cookie, undefined);
    const conflict = await fetch(base + "/api/products?bad=1"); assert.equal(conflict.status, 409); assert.deepEqual(await conflict.json(), { error: "invalid product" });
    assert.equal((await fetch(base + "/api/products?redirect=1")).status, 502);
    assert.equal((await fetch(base + "/api/products?fail=1")).status, 502);
    assert.ok(!logs.join("").includes("credential")); assert.ok(!logs.join("").includes("secret="));
    const before = calls.length;
    assert.equal((await fetch(base + "/api/integrations/telegram/notifications/claim", { method: "POST" })).status, 404);
    assert.equal((await fetch(base + "/api/me", { headers: { Origin: "https://attacker.test" } })).status, 403); assert.equal(calls.length, before);
    assert.equal((await fetch(base + "/api/missing", { method: "POST" })).headers.get("content-type").includes("application/json"), true);
    assert.equal(await (await fetch(base + "/profile")).text(), "<html>BakeU</html>");
    assert.equal((await fetch(base + "/assets/missing.js")).status, 404);
    assert.equal((await fetch(base + "/assets/app.js")).headers.get("cache-control"), "public, max-age=31536000, immutable");
  } finally { await new Promise((resolve) => server.close(resolve)); await rm(dir, { recursive: true, force: true }); }
});

test("Railway staging requires explicit isolated upstreams even in legacy mode", () => {
  const staging = { RAILWAY_ENVIRONMENT_NAME: "stading" };
  assert.throws(() => readWebsiteConfig(staging), /explicitly/);
  assert.throws(() => readWebsiteConfig({ ...staging, WEB_GO_API_URL: "https://bakeu-backend-production.up.railway.app", WEB_BOT_API_URL: "https://test-bot.example" }), /known production/);
  assert.equal(readWebsiteConfig({ ...staging, WEB_GO_API_URL: "http://go.railway.internal:8080", WEB_BOT_API_URL: "https://test-bot.example" }).go, "http://go.railway.internal:8080");
  assert.throws(() => readWebsiteConfig({ WEB_ACCOUNTS_MODE: "go" }), /explicitly/);
});

test("build metadata exposes only a validated build-time revision", () => {
  const sha = "A".repeat(40);
  assert.equal(publicBuildMetadata({ RAILWAY_GIT_COMMIT_SHA: sha }).commit, sha.toLowerCase());
  assert.equal(publicBuildMetadata({ RAILWAY_GIT_COMMIT_SHA: "untrusted-build-input" }).commit, undefined);
});

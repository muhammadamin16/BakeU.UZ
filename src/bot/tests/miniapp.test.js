import { seedLegacyApplication } from "./helpers.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { verifyInitData, createMiniAppAuth } from "../services/miniAppAuth.js";
import { createApiServer } from "../services/httpServer.js";
import { setup, fields } from "./helpers.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";
import { miniAppUrl } from "../utils/formatMessage.js";
const token = "12345:test-bot-token-never-real-abcdefghijklmnop";

test("Go Mini App launch verifies signed actor data before using the bridge and creates no SQLite customer identity",async()=>{
  const s=setup();s.config={...s.config,token,adminIds:[]};const actors=[];
  const backend=createServer((req,res)=>{actors.push(req.headers["x-telegram-user-id"]);assert.equal(req.headers.authorization,"Bearer "+"s".repeat(40));res.setHeader("Content-Type","application/json");res.end(JSON.stringify({linked:false}));});
  await new Promise(resolve=>backend.listen(0,"127.0.0.1",resolve));
  const server=createApiServer({...s,ordersSettings:{enabled:false,accountsEnabled:true,baseUrl:`http://127.0.0.1:${backend.address().port}`,token:"s".repeat(40)}});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const post=body=>fetch(`http://127.0.0.1:${server.address().port}/api/miniapp/go-session`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  try{
    const raw=sign({id:777,first_name:"Buyer"});assert.equal((await post({initData:raw.replace("Buyer","Forged")})).status,401);assert.equal(actors.length,0);
    const response=await post({initData:raw,telegramId:"12345",role:"admin"});assert.equal(response.status,200);const launch=await response.json();assert.deepEqual(actors,["777"]);assert.equal(launch.linked,false);assert.equal(launch.telegramUser.id,"777");assert.equal(launch.admin,null);assert.ok(!JSON.stringify(launch).includes("s".repeat(40)));
    assert.equal(s.repo.stats().customers,0);assert.equal(s.db.prepare("SELECT COUNT(*) n FROM miniapp_sessions").get().n,0);
  }finally{await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>backend.close(resolve));s.db.close();}
});
function sign(
  user = { id: 12345, first_name: "Admin" },
  date = Math.floor(Date.now() / 1000),
) {
  const params = new URLSearchParams({
    auth_date: String(date),
    query_id: "test-query",
    user: JSON.stringify(user),
  });
  const check = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + "=" + v)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}
test("Mini App verifies Telegram signature, expiry and exact user identity", () => {
  const raw = sign();
  assert.equal(verifyInitData(raw, token).id, "12345");
  assert.throws(
    () => verifyInitData(raw.replace("Admin", "Forged"), token),
    (e) => e.status === 401,
  );
  assert.throws(
    () =>
      verifyInitData(
        sign(undefined, Math.floor(Date.now() / 1000) - 301),
        token,
      ),
    (e) => e.status === 401,
  );
  assert.throws(
    () =>
      verifyInitData(
        sign(undefined, Math.floor(Date.now() / 1000) + 120),
        token,
      ),
    (e) => e.status === 401,
  );
  assert.throws(
    () =>
      verifyInitData(
        raw +
          "&user=" +
          encodeURIComponent(JSON.stringify({ id: 12345, first_name: "Fake" })),
        token,
      ),
    (e) => e.status === 401,
  );
  assert.throws(
    () => verifyInitData(sign({ id: 1.2, first_name: "Fake" }), token),
    (e) => e.status === 401,
  );
});
test("admin authority is rechecked on server; body role and normal account token cannot grant access", async () => {
  const s = setup();
  s.config = { ...s.config, token, adminIds: ["12345"] };
  try {
    const mini = createMiniAppAuth(s.repo, s.config);
    const admin = mini.open(sign());
    assert.ok(admin.isAdmin);
    assert.equal(mini.requireAdmin("Bearer " + admin.token).user.id, "12345");
    const regular = mini.open(
      sign({ id: 999, first_name: "Buyer", is_admin: true, role: "admin" }),
    );
    assert.equal(regular.isAdmin, false);
    assert.throws(
      () => mini.requireAdmin("Bearer " + regular.token),
      (e) => e.status === 403,
    );
    const normal = await s.auth.register(fields());
    assert.throws(
      () => mini.requireAdmin("Bearer " + normal.token),
      (e) => e.status === 401,
    );
    s.config.adminIds = [];
    assert.throws(
      () => mini.requireAdmin("Bearer " + admin.token),
      (e) => e.status === 403,
    );
    s.repo.db.prepare("UPDATE miniapp_sessions SET expires_at=0").run();
    assert.throws(
      () => mini.authenticate("Bearer " + admin.token),
      (e) => e.status === 401,
    );
  } finally {
    s.db.close();
  }
});
test("server Mini App API protects real registrations and application decisions", async () => {
  const s = setup();
  s.config = { ...s.config, token, adminIds: ["12345"] };
  const { user } = await s.auth.register(fields("seller"));
  const application = seedLegacyApplication(s.db, s.repo, user);
  const server = createApiServer(s);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/miniapp`;
  const post = async (path, body, auth) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth ? { Authorization: "Bearer " + auth } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    let response = await post("/session", {
      initData: sign({ id: 999, first_name: "Buyer" }),
    });
    assert.equal(response.status, 200);
    const buyer = await response.json();
    response = await fetch(base + "/admin/overview", {
      headers: { Authorization: "Bearer " + buyer.token },
    });
    assert.equal(response.status, 403);
    response = await post("/session", { initData: sign() });
    const admin = await response.json();
    assert.ok(admin.isAdmin);
    const headers = { Authorization: "Bearer " + admin.token };
    response = await fetch(base + "/me", { headers });
    const me = await response.json();
    assert.equal(me.user.id, "12345");
    assert.ok(!me.hash && !me.token);
    response = await fetch(base + "/admin/sellers", { headers });
    const list = await response.json();
    assert.equal(list.rows.length, 1);
    assert.ok(!list.rows[0].password_hash && !list.rows[0].salt);
    response = await post(
      `/admin/applications/${application.id}/decision`,
      { status: "Одобрено" },
      buyer.token,
    );
    assert.equal(response.status, 403);
    response = await post(
      `/admin/applications/${application.id}/decision`,
      { status: "Отклонено" },
      admin.token,
    );
    assert.equal(response.status, 400);
    response = await post(
      `/admin/applications/${application.id}/decision`,
      { status: "Одобрено" },
      admin.token,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).application.status, "Одобрено");
    response = await post(
      `/admin/applications/${application.id}/decision`,
      { status: "Отклонено", reason: "late" },
      admin.token,
    );
    assert.equal((await response.json()).changed, false);
    response = await fetch(base + "/admin/overview", { headers });
    assert.equal((await response.json()).stats.approved, 1);
    response = await fetch(base + "/admin/sellers?page=-1", { headers });
    assert.equal(response.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    s.db.close();
  }
});
test("bot Mini App URL preserves site path and uses a launch query instead of route hash", () => {
  const config = { siteUrl: "https://bakeu.uz/path/#/old", useWebApp: true };
  const url = new URL(miniAppUrl(config));
  assert.equal(url.pathname, "/path/");
  assert.equal(url.searchParams.get("miniapp"), "1");
  assert.equal(url.hash, "");
  assert.equal(
    new URL(miniAppUrl(config, "admin")).searchParams.get("screen"),
    "admin",
  );
  const button = mainKeyboard(config).inline_keyboard[0][0];
  assert.equal(button.web_app.url, url.href);
});

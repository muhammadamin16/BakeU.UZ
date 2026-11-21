import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerDiagnostics } from "../services/workerDiagnostics.js";
import { createOrdersApi } from "../orders/api.js";
import { createOrdersWorker } from "../orders/worker.js";
import { checkBridge } from "../scripts/check-bridge.mjs";
import { readBridgeConnection, readOrdersConfig } from "../orders/config.js";

test("a claim authentication error preserves HTTP 401, backs off and logs no secret/body",async()=>{
  const lines=[];let time=0,calls=0;
  const api=createOrdersApi({enabled:true,baseUrl:"https://backend.test",token:"private-bridge"},{fetchImpl:async()=>{calls++;return Response.json({error:"private user phone +998901234567 and private-bridge"},{status:401});}});
  const flush=createOrdersWorker(api,{}, {enabled:true,now:()=>time,log:value=>lines.push(value)});
  await flush();await flush();assert.equal(calls,1);assert.equal(lines.length,1);const event=JSON.parse(lines[0]);assert.equal(event.httpStatus,401);assert.equal(event.category,"bridge_unauthorized");assert.equal(event.stage,"claim");assert.ok(!lines[0].includes("private-bridge"));assert.ok(!lines[0].includes("998"));
  time=2001;await flush();assert.equal(calls,2);assert.equal(lines.length,1);time=70000;await flush();assert.equal(lines.length,2);
});

test("diagnostics print only whitelisted metadata and retain repeated failure counts",()=>{
  const lines=[];let now=0;const report=createWorkerDiagnostics("legacy_sqlite",{log:v=>lines.push(JSON.parse(v)),now:()=>now});
  report("flush",{code:"SQLITE_CANTOPEN",message:"/private/token"});report("flush",{code:"SQLITE_CANTOPEN"});now=60001;report("flush",{code:"SQLITE_CANTOPEN"});assert.equal(lines.length,2);assert.equal(lines[1].occurrences,2);assert.equal(lines[0].category,"sqlite");assert.ok(!JSON.stringify(lines).includes("/private"));
});

test("bridge check is read-only and reports topology/configuration without serializing returned records",async()=>{
  const settings={enabled:true,baseUrl:"https://backend.test",token:"private-bridge"};let calls=0;
  const result=await checkBridge(settings,{fetchImpl:async(url,options)=>{calls++;assert.equal(options.method,undefined);assert.match(url,/\/diagnostics$/);return Response.json({bridgeVersion:1,databaseConnected:true,transactionsAvailable:false,counts:{secret:"never-print"}});}});
  assert.equal(calls,1);assert.equal(result.category,"mongo_transactions_required");assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes("never-print"));
  assert.deepEqual(await checkBridge(settings,{fetchImpl:async()=>new Response(null,{status:401})}),{ok:false,httpStatus:401,category:"bridge_unauthorized"});
});

test("bridge diagnostics distinguish Mongo probe failures and never echo raw upstream errors", async () => {
  const settings = { enabled: true, baseUrl: "https://backend.test", token: "private-bridge" };
  const result = await checkBridge(settings, { fetchImpl: async () => Response.json({ code: "MONGO_PROBE_UNAUTHORIZED", error: "private password and host", storage: { code: "MONGO_PROBE_UNAUTHORIZED", host: "private-host" } }, { status: 503 }) });
  assert.deepEqual(result, { ok: false, httpStatus: 503, category: "database_readiness_failed", storageCode: "MONGO_PROBE_UNAUTHORIZED" });
  const falseReady = await checkBridge(settings, { fetchImpl: async () => Response.json({ bridgeVersion: 1, databaseConnected: false, transactionsAvailable: true }) });
  assert.equal(falseReady.ok, false); assert.equal(falseReady.category, "database_unavailable");
  const unknown = await checkBridge(settings, { fetchImpl: async () => Response.json({ code: "private-unknown-message" }, { status: 503 }) });
  assert.equal(unknown.storageCode, undefined); assert.ok(!JSON.stringify(unknown).includes("private-"));
});

test("an explicit bridge preflight works before activation without changing service flags", async () => {
  const env = { TELEGRAM_ORDERS_ENABLED: "false", GO_ACCOUNTS_ENABLED: "false", GO_BACKEND_URL: "https://backend.test/api", TELEGRAM_BRIDGE_TOKEN: "x".repeat(40) };
  const before = { ...env };
  assert.deepEqual(readOrdersConfig(env), { enabled: false });
  let calls = 0;
  const result = await checkBridge({ diagnosticsEnabled: true, ...readBridgeConnection(env) }, { fetchImpl: async (url, options) => {
    calls++; assert.equal(url, "https://backend.test/api/integrations/telegram/diagnostics"); assert.equal(options.method, undefined);
    return Response.json({ bridgeVersion: 1, databaseConnected: true, transactionsAvailable: true });
  } });
  assert.equal(result.ok, true); assert.equal(calls, 1); assert.deepEqual(env, before);
});

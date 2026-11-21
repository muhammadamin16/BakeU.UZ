import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerDiagnostics } from "../services/workerDiagnostics.js";
import { createOrdersApi } from "../orders/api.js";
import { createOrdersWorker } from "../orders/worker.js";
import { checkBridge } from "../scripts/check-bridge.mjs";

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

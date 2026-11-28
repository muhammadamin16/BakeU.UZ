import test from "node:test";
import assert from "node:assert/strict";
import { createMiniAccountSession } from "./accountSession.js";

test("Mini App opens the existing Backend UID, refreshes it and never accepts a changed account", async () => {
  let opens=0,exchanges=0,uid="go-user",adminToken="unset";
  const session=createMiniAccountSession({
    accountAPI:{exchangeTelegram:async(ticket)=>{assert.equal(ticket,"proof");exchanges++;return{uid:"go-user",role:"customer",name:"Buyer"};},request:async()=>({uid,role:"customer",name:"Buyer"})},
    openLaunch:async(raw)=>{assert.equal(raw,"signed-init-data");opens++;return{linked:true,ticket:"proof",uid:"go-user",telegramUser:{id:"711",firstName:"Buyer"},admin:null};},
    setAdminToken:value=>{adminToken=value;},readAdmin:async()=>{throw Error("customer must not use a Node admin session");},
  });
  const result=await session.authenticate("signed-init-data");assert.equal(result.user.uid,"go-user");assert.equal(result.user.telegramId,"711");assert.equal(result.accountLinked,true);assert.equal(adminToken,"");
  await session.authenticate("signed-init-data");assert.equal(opens,1);assert.equal(exchanges,1);
  uid="other-user";await assert.rejects(session.authenticate("signed-init-data"),/Аккаунт изменился/);
});

test("an unlinked Telegram actor clears the previous Backend session instead of inheriting or registering it",async()=>{
  let cleared=0;
  const session=createMiniAccountSession({accountAPI:{logout:async()=>{cleared++;}},openLaunch:async()=>({linked:false,telegramUser:{id:"new-actor",firstName:"Guest"},admin:null}),setAdminToken:()=>{},readAdmin:()=>{throw Error("not admin");}});
  const result=await session.authenticate("signed");assert.equal(cleared,1);assert.equal(result.accountLinked,false);assert.equal(result.user.id,"new-actor");assert.equal(result.isAdmin,false);
});

test("revoked Backend sessions stay signed out until an explicit retry, and a guest launch never invokes an exchange",async()=>{
  let opens=0;
  const session=createMiniAccountSession({accountAPI:{exchangeTelegram:async()=>({uid:"go-user",role:"seller"}),request:async()=>{throw Object.assign(Error("revoked"),{status:401});}},openLaunch:async()=>{opens++;return{linked:true,ticket:"proof",uid:"go-user",telegramUser:{id:"711"},admin:null};},setAdminToken:()=>{},readAdmin:()=>{}});
  assert.equal(await session.authenticate(""),null);assert.equal(opens,0);
  await session.authenticate("signed");assert.equal(await session.authenticate("signed"),null);assert.equal(await session.authenticate("signed"),null);assert.equal(opens,1);
  await session.authenticate("signed",{force:true});assert.equal(opens,2);
});

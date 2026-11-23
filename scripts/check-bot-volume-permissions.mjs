// Docker integration test; never accepts a real volume, database or bot token.
// All resources are freshly created with a random test-only name.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
const exec = promisify(execFile);
const image = process.env.BAKEU_TEST_BOT_IMAGE || "bakeu-bot:sqlite-permissions";
const volume = "bakeu-sqlite-permissions-test-" + randomBytes(8).toString("hex");
let stage = "preflight", created = false;
async function docker(args) {
  try { const result = await exec("docker", args, { encoding: "utf8", timeout: 30000 }); return { status: 0, stdout: result.stdout, stderr: result.stderr }; }
  catch (error) { return { status: error.code, stdout: error.stdout || "", stderr: error.stderr || "" }; }
}
const fixture = `
  import {openDatabase} from '/app/database/index.js';
  import * as fs from 'node:fs';import {createHash} from 'node:crypto';
  fs.chownSync('/data',0,0);fs.chmodSync('/data',0o755);
  function seed(db){
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)').run('existing-user-fixture','fixture@example.invalid','998000000000','client','{}','a'.repeat(128),'b'.repeat(32),'2026-01-01');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run('c'.repeat(64),'existing-user-fixture',9999999999999);
    db.prepare('INSERT INTO metadata(key,value) VALUES(?,?)').run('permission-fixture','preserve-existing-data');
  }
  const db=openDatabase('/data/bakeu.sqlite');seed(db);db.close();
  const retained=openDatabase('/data/retained.sqlite');retained.exec('PRAGMA wal_autocheckpoint=0');seed(retained);
  const paths=['/data/bakeu.sqlite','/data/retained.sqlite','/data/retained.sqlite-wal','/data/retained.sqlite-shm'];
  for(const p of paths){fs.chownSync(p,1000,1000);fs.chmodSync(p,0o600);}
  fs.chmodSync('/data/bakeu.sqlite',0o640); // existing modes must not be normalized
  const snapshots=Object.fromEntries(paths.map(p=>{const s=fs.statSync(p);return[p,{hash:createHash('sha256').update(fs.readFileSync(p)).digest('hex'),uid:s.uid,gid:s.gid,mode:s.mode&0o7777}]}));
  fs.writeFileSync('/data/unrelated.backup',JSON.stringify(snapshots),{mode:0o600});
  fs.writeFileSync('/data/unrelated.sha256',createHash('sha256').update(fs.readFileSync('/data/unrelated.backup')).digest('hex'),{mode:0o600});
  process.kill(process.pid,'SIGKILL'); // retain real uncheckpointed WAL/SHM
`;
const metadataCheck = `
  import assert from 'node:assert/strict';import * as fs from 'node:fs';import {createHash} from 'node:crypto';
  import {prepareSQLitePermissions} from '/app/database/permissions.js';
  const before=JSON.parse(fs.readFileSync('/data/unrelated.backup','utf8'));
  prepareSQLitePermissions('/data/bakeu.sqlite');
  assert.equal(process.getuid(),1000);assert.equal(process.getgid(),1000);assert.ok(!process.getgroups().includes(0));
  assert.throws(()=>process.setuid(0),{code:'EPERM'});assert.throws(()=>process.setgid(0),{code:'EPERM'});
  for(const [p,original]of Object.entries(before)){assert.equal(createHash('sha256').update(fs.readFileSync(p)).digest('hex'),original.hash);const s=fs.statSync(p);assert.equal(s.uid,original.uid);assert.equal(s.gid,original.gid);assert.equal(s.mode&0o7777,original.mode);}
  assert.equal(fs.statSync('/data').uid,1000);assert.equal(fs.statSync('/data').gid,1000);
  assert.equal(fs.statSync('/data').mode&0o7777,0o755);assert.equal(fs.statSync('/data/unrelated.backup').uid,0);
`;
const checkRows = `
  import assert from 'node:assert/strict';import{DatabaseSync}from'node:sqlite';import * as fs from 'node:fs';import{createHash}from'node:crypto';
  for(const path of ['/data/bakeu.sqlite','/data/retained.sqlite']){
  const db=new DatabaseSync(path,{readOnly:true});
  assert.equal(db.prepare('SELECT value FROM metadata WHERE key=?').get('permission-fixture').value,'preserve-existing-data');
  assert.equal(db.prepare('SELECT role FROM users WHERE id=?').get('existing-user-fixture').role,'client');
  assert.equal(db.prepare('SELECT user_id FROM sessions WHERE token_hash=?').get('c'.repeat(64)).user_id,'existing-user-fixture');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get())[0],'ok');db.close();}
  assert.equal(fs.statSync('/data/unrelated.backup').uid,0);assert.equal(fs.statSync('/data/unrelated.backup').mode&0o7777,0o600);
  assert.equal(createHash('sha256').update(fs.readFileSync('/data/unrelated.backup')).digest('hex'),fs.readFileSync('/data/unrelated.sha256','utf8'));
`;
const env = ["-e", "BOT_TOKEN=123456:test_only_token_not_a_real_bot_123456", "-e", "ADMIN_IDS=12345", "-e", "RAILWAY_ENVIRONMENT=volume-test", "-e", "DATABASE_PATH=/data/bakeu.sqlite", "-e", "PORT=3000"];
async function run(args, options = []) {
  return docker(["run", "--rm", "--network", "none", "--mount", `type=volume,source=${volume},target=/data`, ...env, ...options, image, ...args]);
}
async function success(args, options) {
  const result = await run(args, options);
  assert.equal(result.status, 0, "Disposable volume test failed at " + stage);
  return result.stdout;
}
try {
  assert.equal((await docker(["image", "inspect", image])).status, 0, "Build the bot test image first.");
  assert.equal((await docker(["volume", "create", volume])).status, 0); created = true;
  stage = "seed_root_755_directory_and_node_owned_existing_data";
  // Namespace PID1 ignores some self-signals. Crash a real child so SQLite
  // cannot checkpoint/close the fixture before the permission-repair test.
  const seeder = `import{spawnSync}from'node:child_process';const child=spawnSync(process.execPath,['--input-type=module','-e',${JSON.stringify(fixture)}],{stdio:'inherit'});process.exit(child.signal==='SIGKILL'?137:child.status??1);`;
  assert.equal((await run(["node", "--input-type=module", "-e", seeder])).status, 137);
  stage = "reproduce_unprivileged_eacces";
  const denied = await run(["node", "index.js", "--miniapp", "--check"], ["--user", "node"]);
  assert.equal(denied.status, 1); assert.match(denied.stderr, /DATABASE_PATH/);
  stage = "metadata_only_repair_and_privilege_drop";
  await success(["node", "--input-type=module", "-e", metadataCheck]);
  stage = "normal_entrypoint_preserves_data";
  const standard = await success(["node", "index.js", "--miniapp", "--check"]);
  assert.match(standard, /uid=1000 gid=1000/); assert.match(standard, /Telegram was not contacted/);
  await success(["node", "--input-type=module", "-e", checkRows]);
  stage = "non_root_http_health_200";
  await success(["node", "--input-type=module", "-e", `
    import assert from 'node:assert/strict';import{once}from'node:events';
    import{prepareSQLitePermissions}from'/app/database/permissions.js';
    import{openDatabase}from'/app/database/index.js';import{createRepository}from'/app/database/repository.js';
    import{readConfig}from'/app/config/index.js';import{createApiServer}from'/app/services/httpServer.js';
    const config=readConfig(process.env);prepareSQLitePermissions(config.databasePath);
    assert.equal(process.getuid(),1000);assert.equal(process.getgid(),1000);
    const db=openDatabase(config.databasePath);const repo=createRepository(db);
    const server=createApiServer({auth:{},repo,config});server.listen(0,'127.0.0.1');await once(server,'listening');
    try{const res=await fetch('http://127.0.0.1:'+server.address().port+'/health');assert.equal(res.status,200);
      assert.deepEqual(await res.json(),{ok:true,service:'bakeu-bot-api'});
    }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));db.close();}
  `]);
  stage = "railway_npm_override_and_restart";
  const custom = await success(["run", "miniapp", "--", "--check"], ["--entrypoint", "npm"]);
  assert.match(custom, /uid=1000 gid=1000/); assert.match(custom, /Telegram was not contacted/);
  await success(["node", "--input-type=module", "-e", checkRows]);
  stage = "refuse_symlink_hardlink_and_outside_scope";
  for (const [setup, path, outside] of [
    ["fs.symlinkSync('/tmp/outside','/data/symlink.sqlite')", "/data/symlink.sqlite", "/tmp/outside"],
    ["fs.writeFileSync('/data/hardlink-source','unchanged',{mode:0o600});fs.linkSync('/data/hardlink-source','/data/hardlink.sqlite')", "/data/hardlink.sqlite", "/data/hardlink-source"],
    ["fs.symlinkSync('/tmp','/data/linked-parent')", "/data/linked-parent/unsafe.sqlite", "/tmp/outside"],
    ["fs.writeFileSync('/data/journal.sqlite','unchanged',{mode:0o600});fs.symlinkSync('/tmp/outside','/data/journal.sqlite-wal')", "/data/journal.sqlite", "/tmp/outside"],
  ]) {
    await success(["node", "--input-type=module", "-e", `import assert from 'node:assert/strict';import * as fs from 'node:fs';import{prepareSQLitePermissions}from'/app/database/permissions.js';fs.writeFileSync('/tmp/outside','unchanged',{mode:0o600});${setup};assert.throws(()=>prepareSQLitePermissions(${JSON.stringify(path)}));assert.equal(fs.statSync(${JSON.stringify(outside)}).uid,0);assert.equal(fs.readFileSync(${JSON.stringify(outside)},'utf8'),'unchanged');`]);
  }
  await success(["node", "--input-type=module", "-e", "import assert from 'node:assert/strict';import{prepareSQLitePermissions}from'/app/database/permissions.js';assert.throws(()=>prepareSQLitePermissions('/etc/passwd'));assert.equal(process.getuid(),0);"]);
  stage = "root_owned_existing_database_is_not_silently_chowned";
  await success(["node", "--input-type=module", "-e", `
    import assert from 'node:assert/strict';import * as fs from 'node:fs';import{prepareSQLitePermissions}from'/app/database/permissions.js';
    fs.writeFileSync('/data/root-owned.sqlite','unchanged',{mode:0o600});
    fs.mkdirSync('/data/unrelated-directory',{mode:0o750});
    prepareSQLitePermissions('/data/root-owned.sqlite');
    assert.equal(fs.statSync('/data/root-owned.sqlite').uid,0);assert.equal(fs.statSync('/data/root-owned.sqlite').mode&0o7777,0o600);
    assert.throws(()=>fs.readFileSync('/data/root-owned.sqlite'),{code:'EACCES'});
    assert.equal(fs.statSync('/data/unrelated-directory').uid,0);assert.equal(fs.statSync('/data/unrelated-directory').mode&0o7777,0o750);
  `]);
  stage = "nested_new_database_is_private";
  const nested = await success(["node", "index.js", "--miniapp", "--check"], ["-e", "DATABASE_PATH=/data/nested/new.sqlite"]);
  assert.match(nested, /uid=1000 gid=1000/);
  await success(["node", "--input-type=module", "-e", checkRows]);
  console.log(JSON.stringify({ ok: true, dataSource: "disposable_volume_only", root755DirectoryEACCESReproduced: true, onlyDataDirectoryOwnershipChanged: true, databaseAndWalBytesPreservedByRepair: true, rowsAndIntegrityPreservedAfterStartup: true, botUID: 1000, botGID: 1000, directoryMode: "0755_preserved", existingFileModesPreserved: ["0640", "0600"], unrelatedFilesUntouched: true, npmOverrideAndRestartPassed: true, healthHTTPStatus: 200, unsafePathsRefused: true, telegramContacted: false, productionTouched: false }));
} catch (error) { console.error(JSON.stringify({ ok: false, stage, ...(typeof error.actual === "number" ? { actualExitStatus: error.actual } : {}), productionTouched: false })); process.exitCode = 1; }
finally { if (created) await docker(["volume", "rm", volume]); }

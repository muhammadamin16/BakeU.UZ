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
  fs.chownSync('/data',0,0);fs.chmodSync('/data',0o700);
  const db=openDatabase('/data/bakeu.sqlite');db.exec('PRAGMA wal_autocheckpoint=0');
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)').run('existing-user-fixture','fixture@example.invalid','998000000000','client','{}','a'.repeat(128),'b'.repeat(32),'2026-01-01');
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run('c'.repeat(64),'existing-user-fixture',9999999999999);
  db.prepare('INSERT INTO metadata(key,value) VALUES(?,?)').run('permission-fixture','preserve-existing-data');
  const paths=['/data/bakeu.sqlite','/data/bakeu.sqlite-wal','/data/bakeu.sqlite-shm'];
  for(const p of paths)fs.chmodSync(p,0o600);
  const hashes=Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
  fs.writeFileSync('/data/unrelated.backup',JSON.stringify(hashes),{mode:0o600});
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
  for(const [p,hash]of Object.entries(before)){assert.equal(createHash('sha256').update(fs.readFileSync(p)).digest('hex'),hash);const s=fs.statSync(p);assert.equal(s.uid,1000);assert.equal(s.gid,1000);assert.equal(s.mode&0o7777,0o600);}
  assert.equal(fs.statSync('/data').mode&0o7777,0o700);assert.equal(fs.statSync('/data/unrelated.backup').uid,0);
`;
const checkRows = `
  import assert from 'node:assert/strict';import{DatabaseSync}from'node:sqlite';import * as fs from 'node:fs';import{createHash}from'node:crypto';
  const db=new DatabaseSync('/data/bakeu.sqlite',{readOnly:true});
  assert.equal(db.prepare('SELECT value FROM metadata WHERE key=?').get('permission-fixture').value,'preserve-existing-data');
  assert.equal(db.prepare('SELECT role FROM users WHERE id=?').get('existing-user-fixture').role,'client');
  assert.equal(db.prepare('SELECT user_id FROM sessions WHERE token_hash=?').get('c'.repeat(64)).user_id,'existing-user-fixture');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get())[0],'ok');db.close();
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
  stage = "seed_root_owned_existing_wal";
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
  stage = "nested_new_database_is_private";
  const nested = await success(["node", "index.js", "--miniapp", "--check"], ["-e", "DATABASE_PATH=/data/nested/new.sqlite"]);
  assert.match(nested, /uid=1000 gid=1000/);
  await success(["node", "--input-type=module", "-e", checkRows]);
  console.log(JSON.stringify({ ok: true, dataSource: "disposable_volume_only", rootOwnedEACCESReproduced: true, databaseAndWalBytesPreservedByRepair: true, rowsAndIntegrityPreservedAfterStartup: true, botUID: 1000, botGID: 1000, directoryMode: "0700", databaseMode: "0600", unrelatedFilesUntouched: true, npmOverrideAndRestartPassed: true, unsafePathsRefused: true, telegramContacted: false, productionTouched: false }));
} catch (error) { console.error(JSON.stringify({ ok: false, stage, ...(typeof error.actual === "number" ? { actualExitStatus: error.actual } : {}), productionTouched: false })); process.exitCode = 1; }
finally { if (created) await docker(["volume", "rm", volume]); }

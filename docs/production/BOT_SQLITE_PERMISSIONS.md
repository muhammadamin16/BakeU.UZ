# Railway staging Bot: directory-only SQLite permission fix

Scope: BakeU.UZ `src/bot`, staging only. No Railway deployment, variable,
volume, database or Telegram account is changed by preparing this PR.

## Cause and exact scope

Reported staging configuration: Bot UID/GID `1000:1000` (`node`), `/data`
owned by `root:root` with mode `0755`, `DATABASE_PATH=/data/bakeu.sqlite`.
Node cannot create SQLite WAL/SHM/journal files in that directory. Ownership
set during Docker build does not apply to a volume mounted afterwards.

The image starts as root solely for preparation. The real `index.js` startup
calls `prepareSQLitePermissions` before opening SQLite or starting Telegram,
HTTP or workers. The helper:

- Resolves the image's existing `node` UID/GID from `/etc/passwd`.
- Changes ownership of **only the `/data` directory itself**, using a held
  directory descriptor. It preserves the reported `0755` mode. There is no
  recursive chown, chmod, file replacement, volume recreation or data migration.
- Does **not** change existing SQLite files, WAL/SHM/journals, backups or child
  directories: their ownership, modes and bytes remain untouched by preparation.
- Rejects symlink components, symlink journals, non-regular/hard-linked database
  files and DATABASE_PATH outside `/data` or the image's default `/app/data`.
  `/app/data` ownership is set at image build only, never repaired at runtime.
  Missing nested directories are created later by the unprivileged application.
- Resets supplementary groups, then drops GID and UID to `node` before SQLite
  access. New files use umask `0077`. It cannot regain UID/GID 0.

The baked `BAKEU_SQLITE_BOOTSTRAP=true` flag enables this Linux container path.
The default direct `node index.js --miniapp` CMD becomes non-root PID 1.
Railway's custom `npm run miniapp` also invokes the same helper in the actual
Bot child; an npm supervisor may remain root. Prefer the default image CMD.
Native Windows/macOS startup is unchanged. A process already running as node
cannot repair a root-owned volume; do not set a runtime user override until the
mount has suitable ownership. Root startup without the image flag fails closed.

This fixes the reported **directory** permission failure. If existing SQLite
files are themselves inaccessible (for example root-owned `0600`), startup
fails with a DATABASE_PATH diagnostic. It intentionally does not chown those
files or loosen their modes; retain them and inspect ownership before planning
any separate repair. Read-only mounts or denied chown also fail without a
fallback database, deletion or continued root Bot execution.

SQLite itself may normally checkpoint WAL and remove journals after the helper
has dropped privileges. That engine behavior is different from permission
preparation; existing user/session rows must survive it.

## Local verification without Railway data

Node 24 and Docker, from the repository root:

```sh
docker build -t bakeu-bot:sqlite-permissions src/bot
npm --prefix src/bot test
npm run bot:volume:test
npm run test:integration
```

The regression test uses a fresh randomly named test volume, fake credentials
and disabled external networking. It never accepts an existing volume name.
It checks:

1. Root-owned `0755` `/data`, existing node-owned `0640` SQLite, and the original
   unprivileged startup failure when SQLite needs to create its journals.
2. Directory-only ownership repair, unchanged `0755`, existing SQLite/WAL/SHM
   byte hashes and file UID/GID/modes, and untouched root-owned backup/subdirectory.
3. UID/GID `1000:1000`, no root supplementary group and no ability to regain root.
4. Real `index.js --miniapp --check`, custom npm startup and restart with the
   same volume; original user/session/metadata and SQLite integrity/foreign keys.
5. A real request to the existing HTTP server's `/health` route **as node**,
   with HTTP 200 and `{"ok":true,"service":"bakeu-bot-api"}`. Telegram is not
   called: this is a local server smoke test, not a full Telegram polling run.
6. Unsafe paths rejected and an inaccessible existing root-owned DB left intact.

Only its own disposable test volume is cleaned up. No force flag or permissive
chmod is used. No real staging/production volume is mounted by these tests.

## Staging verification after PR review

These are operator steps, **not actions performed automatically by this PR**.

1. Select Railway **staging** and the **Bot** service. Record its current
   deployment/commit, existing volume ID, mount `/data`, and DATABASE_PATH.
   Keep the existing private SQLite backup. Do not detach, delete, recreate,
   restore over or replace that volume. Do not select production.
2. Read-only metadata inspection in the current staging container:

   ```sh
   stat -c '%u:%g %a %n' /data /data/bakeu.sqlite
   ```

   Confirm the reported directory `0:0 755`. Record the database file metadata;
   this fix does not repair file ownership. Missing WAL/SHM after checkpoint is
   normal; never delete them to try to fix permissions.
3. Review and deploy only the PR's Bot image in staging, keeping the same volume
   and all existing Bot/account/order variables. Bot Root Directory is `src/bot`,
   Dockerfile is `Dockerfile`, Railway config is `src/bot/railway.json`.
   That config already sets **`healthcheckPath: /health`**, timeout 180 seconds.
   Do not use the website root config (`/healthz`). Keep
   `DATABASE_PATH=/data/bakeu.sqlite`, use Railway's injected `PORT` and the
   existing API host configuration. The default image CMD is recommended.
4. Check deployment logs: `SQLite service identity: uid=1000 gid=1000.`,
   no SQLite open error, then API listening. The full Bot also requires its
   existing valid Telegram credentials/connectivity; `/health` cannot bypass
   a Telegram startup failure. Repeat the metadata check: `/data` should now
   be `1000:1000 755`; existing DB file ownership/mode should be unchanged.
   An exec shell's `id` does not prove the Bot identity; use the startup log.
5. In PowerShell, replace the placeholder with the **staging Bot** public domain:

   ```powershell
   $stagingBotUrl = "https://YOUR-STAGING-BOT-DOMAIN"
   $response = Invoke-WebRequest -Uri "$stagingBotUrl/health"
   $response.StatusCode
   $response.Content
   if ($response.StatusCode -ne 200) { throw "Staging Bot health failed" }
   $body = $response.Content | ConvertFrom-Json
   if ($body.ok -ne $true -or $body.service -ne "bakeu-bot-api") {
     throw "Unexpected staging health response"
   }
   ```

   Expected status: `200`. Expected JSON:
   `{"ok":true,"service":"bakeu-bot-api"}`. No secret or authorization header
   is needed for this endpoint. HTTP 502/503 or a non-JSON page is not a pass;
   check that the domain targets the Bot service/PORT and inspect its logs.
6. Use authorized read-only access to confirm expected existing users/sessions
   and SQLite integrity; `/health` alone does not prove preserved records.
   Restart staging once with the **same volume** and repeat steps 4–6 without
   triggering test messages to real users. Retain the recorded rollback image.

Live staging `/health` remains an operator check until the reviewed image is
actually deployed there. Production, MongoDB and existing SQLite data are
outside this change's deployment scope.

## Executed validation

70 Bot tests and 90 repository integration tests passed. Docker image build and
the disposable-volume regression passed, including the local non-root HTTP 200
check. Lint reports zero errors and two existing React dependency warnings.
The branch also includes an explicit `node:process` import for the target branch's
existing Vite lint error; it changes no website behavior or dependencies.

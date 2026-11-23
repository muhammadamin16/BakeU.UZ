# Railway staging bot: preserve the SQLite volume while fixing EACCES

Scope: BakeU.UZ `src/bot`, audited from Amin6861d6f on24 November2026.
No Railway service, volume, variable, database or Telegram account was changed
by this source fix. This is a PR candidate, not a production deployment.

## Confirmed source-level cause

The old image chowned `/app/data` during build and then used `USER node`.
Railway mounts `/data` at runtime, after the image is built. A root-owned0700
volume or root-owned0600 SQLite file is therefore inaccessible to that user.
Chowning the image's /app/data cannot repair the runtime mount. SQLite also needs
the parent directory and its WAL/SHM/rollback-journal files, not just the main DB.
The exact staging volume owner was not read remotely; this failure was reproduced
on a root-owned disposable volume with a real existing database and crash-left WAL.

## Fix and privilege boundary

- The Docker image starts with root only for storage preparation and bakes
  `BAKEU_SQLITE_BOOTSTRAP=true`. No operator secret or new manual flag is required.
- The real `index.js` invokes preparation before SQLite, Telegram, workers or API
  startup. Railway's custom `npm run miniapp` therefore takes the same path;
  correctness does not depend on an overridable Docker ENTRYPOINT wrapper.
- Root repair is limited to DATABASE_PATH below `/data` or the image's `/app/data`,
  its parent chain within that managed root, and exactly DB, DB-wal, DB-shm and
  DB-journal. No recursive chown or glob over backups/other volume contents.
- Directory FDs and O_NOFOLLOW anchor the traversal. Symlink components, symlink
  journals, non-regular files, hard-linked DB/journals and paths outside the
  managed roots are refused rather than followed or replaced.
- Directories become0700; database/journals0600; ownership matches the existing
  image account `node` (currently UID/GID1000). No chmod777, data copy, truncate,
  unlink, recreation, migration, password/role/session reset or fallback DB path.
- Supplementary groups are reset and the bot drops GID/UID to node before opening
  SQLite. New Docker-created files use umask0077. Direct startup's PID1 becomes
  that unprivileged bot. With a custom npm launcher the npm supervisor can remain
  root, but the actual bot child drops privileges before SQLite/network access.
  Prefer the image's direct default CMD if no npm supervisor is needed.
- Non-root startup never attempts privileged repair. Root startup outside the
  image bootstrap refuses to serve as root. Native Windows/macOS behavior is
  unchanged. A Linux VPS should run the existing dedicated service user.

Only filesystem metadata is changed by the helper. SQLite's normal subsequent
WAL recovery/checkpoint may legitimately change the main DB and remove journals;
the helper does not remove or rewrite them. Existing rows and integrity must
survive that normal engine behavior.

The mount must actually be writable and allow owner changes. If storage is
read-only, ownership changes are disallowed, or an unsafe path is found, startup
fails with a DATABASE_PATH/volume diagnostic. It never falls back to deleting the
DB, running the bot permanently as root or broadening access to everyone.

## Reproduce and verify without Railway data

From the repository root, Docker and Node24 installed:

```sh
docker build -t bakeu-bot:sqlite-permissions src/bot
npm --prefix src/bot test
npm run bot:volume:test
```

The volume test creates a new random `bakeu-sqlite-permissions-test-*` volume,
with a fake user/session and metadata record in an existing full-schema database.
Its writer is killed to leave actual uncheckpointed WAL/SHM. The test:

1. Reproduces EACCES as node against root-owned0700/0600 storage.
2. Runs only the metadata repair and verifies exact DB/WAL/SHM hashes unchanged.
3. Checks UID/GID1000, no root supplementary group, directory0700 and files0600.
4. Runs `index.js --miniapp --check`, then the npm override and another restart.
5. Verifies original user/session/metadata, foreign keys and integrity_check.
6. Confirms unrelated root-owned backup ownership/content is untouched and unsafe
   paths are refused. A nested new database path is also checked.

It uses fake settings, disabled networking and `--check`: Telegram is never
contacted. Only the test's own disposable volume is removed afterwards. It does
not accept a real volume or database path. Bot-only Docker context is retained.

## Staging rollout after PR review

1. Record the existing **staging** bot deployment, volume ID/mount and
   DATABASE_PATH; retain a consistent private SQLite backup. Do not detach,
   recreate or restore over the existing volume. Do not change production.
2. Deploy the reviewed bot image from `src/bot` with the same volume at `/data`
   and `DATABASE_PATH=/data/bakeu.sqlite`. Keep BOT_TOKEN, admin IDs and account/
   order flags unchanged. The direct image CMD and existing npm launcher are
   supported; do not override the image to `USER node` on a still-root-owned mount.
3. The startup log should show `SQLite service identity: uid=1000 gid=1000.` and
   proceed beyond the database stage. Check /health and expected existing records
   through authorized access. /health alone is not proof of preserved data.
4. A read-only owner check may use `stat` on `/data` and the configured DB/journals.
   Missing WAL/SHM after checkpoint is normal. An exec shell's `id` reflects the
   exec user, not necessarily the bot; use the startup identity or bot PID status.
5. Restart once with the same volume and confirm rows/sessions remain. Do not
   trigger test sends to real users merely to validate file permissions.

No manual recursive chmod/chown or chmod777 is needed. If it still fails,
inspect read-only/writable mount settings and owner metadata privately; keep the
volume/data intact and stop rather than deleting journals or the DB. Reverting
the source image preserves data but an older USER-node image may fail again
because access depends on the runtime volume owner; use the recorded owner
metadata and a reviewed recovery plan rather than resetting storage.

## Executed validation

Bot tests: 70 passed. Repository integration tests: 90 passed. Docker image build
and the disposable-volume test above passed. Lint has zero errors and two
pre-existing exhaustive-deps warnings; website build passed with its existing
chunk-size warning. The fetched target also contained a Vite `process` no-undef
error; adding its explicit node:process import fixes that lint blocker without
changing website behavior. No dependencies were added.

No real Telegram request or staging/production volume mutation was performed.
The failure/repair proof uses only the test-owned volume, fake settings and
--check startup. Live staging deployment and record verification remain separate.

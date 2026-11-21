# Production integration continuation — 22 November 2026

## Current source and no duplicate implementation

Fetched both targets before editing. Website Amin is1b61473 (PR22 merges the
previous integration branch17652aa). Backend main is7ca3c31 (PR14 merges
previous ec94834/78f5a06; PR13 adds explicit Mongo settings and optional public
product pagination). Git ancestry confirms both previous branches are included.
The previous diffs contain44 website paths and37 backend paths; their contents
were inspected/reused, not reapplied. New work is on
`codex/mongodb-readiness-20261122` in each repository.

The dated architecture table above in ARCHITECTURE.md describes the old baseline,
not remaining bugs after merge. Current merged source already has the gateway,
Go verified accounts/refresh sessions, signed Mini App exchange, server favorites,
revision-safe carts/variants/checkout/history, UID-preserving self-service shops,
real seller statistics, protected shop moderation and categorized outbox logging.
Backend product pagination remains opt-in; legacy unpaged array callers are
compatible, so no duplicate catalog rewrite was necessary.

## Confirmed production diagnosis

The owner supplied the exact image/Start Command, missing RS_* variables and
hello projection. In the inspected Railway mongo-ha wrapper, no RS_SEEDS means
standalone mode. setName=null and primary=true with session timeout30 is
consistent with that mode; sessions alone do not provide transactions.
`MONGO_TRANSACTIONS_REQUIRED` is therefore a valid deployment blocker here,
not a reason to bypass readiness. The Start Command's missing raw --replSet
is not sufficient by itself: the current image shim delegates to its wrapper.

The owner's existing44 MB Railway backup is not restore-verified. Production
user/seller/shop/product/order/session counts and migration conflicts are not
available. No real backup, inventory, migration, flag change, deployment, database
write, infrastructure mutation or live Telegram send was performed in this work.

Backend image-specific plan, exact prospective variables, backup/restore gates,
options, downtime and rollback:
https://github.com/muhammadamin16/BakeU-Backend/blob/codex/mongodb-readiness-20261122/docs/production/MONGODB_READINESS.md

## New safe code changes

Backend: read-only storage projection distinguishes standalone, uninitialized
replica set, primary/session/wire-version failures and probe/auth/network errors.
The public readiness response keeps503 and reports a safe reason; probe failures
are no longer all labelled transaction absence. An authorized bridge diagnostic
uses the same projection. `/mongo-readiness` ships in the backend image without
calling application startup/index creation. SQLite online backup tooling handles
committed WAL and refuses overwrite. A disposable Docker rehearsal verifies the
actual Railway image's same-volume conversion with authentication and backup
restore, plus Go health/readiness and transaction commit/abort.

Website/bot: bridge:check --configured can preflight with activation flags still off; it preserves whitelisted Mongo reason codes while refusing
raw upstream messages/records. Public deploy:check now reads bakeu-build.json and
compares public flags with actual gateway mode, including optional
BAKEU_EXPECT_ACCOUNTS_MODE=go. It performs no registration, login, notification
claim/send or order write. Source changes do not enable any production flag.

## Validation for this continuation

- npm ci: passed (workspace npm cache).
- npm run test:integration:88 passed, including existing compatibility and new
  deployed-build/runtime metadata mismatch checks.
- npm --prefix src/bot test:69 passed, including Mongo probe failures and safe
  bridge diagnostic output.
- npm run build: passed with Go-enabled /api configuration.
- npm run lint:0 errors;2 existing exhaustive-deps warnings remain.
- miniapp:check: passed with explicit fake bot/admin settings and disposable DB;
  no real Telegram contact.
- Go test ./..., race detector and go vet run against the isolated replica set
  and standalone Mongo. See backend validation record for final results.
- SQLite backup/export tests pass; active WAL, source byte preservation,
  integrity, private mode, refusal to overwrite and no invented identity proof.
- Docker rehearsal on the pinned actual mongo-ha image passed: authenticated
  standalone → consistent fixture backup → isolated restore → same test volume
  using native wrapper RS environment and existing Start Command → primary →
  real commit/abort → Go /healthz200 and /readyz200. No manual initiation was
  used for that image. Existing fixture documents and indexes survived.
- The generic official mongo:8.0 alternative was separately rehearsed successfully
  with a guarded, lab-only initialization. It is not the recommended production
  path for the owner's mongo-ha image.

The pinned image tested locally is
`ghcr.io/railwayapp-templates/mongo-ha/mongo@sha256:3acae065fa9c725197cfcc721fb3d2160b2972924b08bba71617215ffd8ca802`
(MongoDB8.0.38). Production's deployed digest is still unknown. Rehearsal data,
checksums and timing are synthetic; they are not evidence that the owner's44 MB
backup restores, that production downtime will match, or that data was migrated.

## What remains, by production gate

| Area | Status / required action |
| --- | --- |
| Data protection | Verify actual Mongo and SQLite backup restore/checksums in isolation; preserve original volumes |
| Mongo readiness | Execute approved image-specific conversion only after backup/clone rehearsal; confirm actual primary, URI and /readyz |
| SQLite migration | Read-only inventory/claim plan exists; real inventories unavailable; no automatic merge/import/secure claim execution activated |
| Unified auth | Source and local coverage available; keep coordinated flags off until readiness and legacy-user recovery pass |
| Marketplace | Existing Go data flows locally tested; real deployment/records and full mobile/WebView acceptance pending |
| Admin | Go UID-based shop moderation exists; full Go customer/seller management is not established by the legacy demo/SQLite admin UI and must not be represented as real Mongo inventory |
| Outbox | Improvements are merged source; deployed version/logs and real linked test-account delivery remain unverified. Do not label the cause a token mismatch or auto-resend uncertain sends |
| Permanent domain | No activation. Cloudflare/bakeu.uz comes after all service and live acceptance checks |

## Ordered service and live acceptance gates

1. Restore-verified Mongo+SQLite backups; real private inventory and owner approval.
2. Mongo same-volume transaction readiness, same protected credentials/private DNS.
3. Go API/URI/index/health/readiness; keep current JWT secret and intended bakeu DB.
4. Bot matching bridge secret/private volume, miniapp:check and read-only
   bridge:check. Preserve BOT_TOKEN and existing SQLite users.
5. Website same-origin /api build and runtime consistency; all CORS origins exact.
6. Approved coordinated phone-account activation, then separately approved
   SELLER_SELF_SERVICE. Existing pending/rejected/suspended shops stay moderated.
7. With an explicitly approved real test account: buyer registration creates one
   Mongo UID and no SQLite identity; login/refresh/logout/re-login; signed Mini App
   same UID; customer opens own verified GPS shop retaining purchase history;
   seller adds a real product; buyer views variants/favorites/cart and checks out;
   seller receives an actual Telegram receipt, changes status; buyer sees history;
   restart confirms order/cart/favorites; reconcile all preserved existing users.
8. Only after that review Cloudflare and bakeu.uz. No production/domain change is
   authorized automatically by source pushes.

Expected400/401/403/404/409 business validation must remain visible. Verify no
accidental405 or static HTML on API routes. Real Telegram sends, uncertain-state
resolution and any approved production test writes must be explicitly coordinated.

**Next single operator action:** restore-test the actual44 MB backup in isolation,
without using Restore on the live production volume. Do not add RS variables yet.

The bridge preflight was exercised against the actual new Go diagnostic handler
on disposable replica and standalone storage. It returned respectively
MONGO_TRANSACTIONS_READY and MONGO_STANDALONE, and --configured also worked with
bot feature flags false. No worker was activated and no Telegram message sent.

## Publication

Both new feature branches were pushed. Draft PR creation against backend main
and website Amin was attempted, but GitHub API returned Forbidden. No new PR,
merge or production deployment is claimed. Review comparisons:

- https://github.com/muhammadamin16/BakeU-Backend/compare/main...codex/mongodb-readiness-20261122
- https://github.com/muhammadamin16/BakeU.UZ/compare/Amin...codex/mongodb-readiness-20261122

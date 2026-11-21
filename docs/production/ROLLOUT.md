# Railway deployment, activation and rollback

22 November continuation: the old feature branches are merged (website PR22,
backend PR14 plus backend PR13). The owner confirmed standalone MongoDB in the
Railway mongo-ha image: RS_SEEDS/RS_ENABLED/RS_NAME/RS_KEY are absent. Its44 MB
backup has not been restore-verified. **MongoDB readiness and verified restore
come before Go → bot → website → live tests → future Cloudflare/bakeu.uz work.**
Keep production cutover/self-service flags off and do not activate bakeu.uz.
The exact image-specific plan and rollback are in the backend companion:
https://github.com/muhammadamin16/BakeU-Backend/blob/codex/mongodb-readiness-20261122/docs/production/MONGODB_READINESS.md

Prepared 21 November 2026. **No live deployment, variable change, migration or
merge has been performed.** Production cannot be called integrated until the
live acceptance checklist below is completed. Read ARCHITECTURE.md first; the
backend companion document is `docs/production/MIGRATION.md` in BakeU-Backend.

## Exact service setup

| Service | Source / root | Build / start | Readiness and storage |
| --- | --- | --- | --- |
| Website | BakeU.UZ, Amin, `/` | Root Dockerfile; npm ci then npm run build; npm start (Docker starts the same script) | /healthz; immutable dist; no database credentials |
| Bot | BakeU.UZ, Amin, `/src/bot` | Existing local-root Dockerfile; npm run miniapp | /health; `/data/bakeu.sqlite` on bakeu-bot-volume; Node24 |
| Go | BakeU-Backend, main, `/` | Existing multistage Dockerfile; /server | /healthz liveness; **/readyz transaction readiness** now used by railway.json; mongodb-volume retained |
| Mongo | existing service | Preserve current data and authentication | Private network; transactions require replica set or mongos plus sessions |

These are intended reviewed settings, not a readout of the inaccessible Railway
project. Railway public routing must target each service's actual injected PORT.
The bot uses PORT ahead of a stale API_PORT, and binds 0.0.0.0 on Railway. Do not
replace the existing Mongo service/volume to obtain a replica set. If /readyz
reports MONGO_TRANSACTIONS_REQUIRED, stop activation and arrange a backed-up,
reviewed topology change. A ping or /healthz 200 does not demonstrate transactions.

The website gateway serves real files and SPA routes, proxies known API routes,
forwards Go refresh cookies on the same website origin and blocks browser access
to the service bridge. A Node runtime is required; static-only hosting and Vite
preview are not substitutes. No Go service secret is held by the gateway.

## Variables — Go runtime

| Variable | Classification / required value |
| --- | --- |
| PORT | Railway-generated runtime port; do not hardcode from a screenshot |
| MONGODB_URI | Secret runtime reference to Mongo's authenticated **private** URI; use Railway's Variables reference picker for the existing Mongo service |
| MONGODB_DB | Required `bakeu`; confirm the existing data namespace before deploy |
| JWT_SECRET | Existing protected secret; do not rotate casually or use as bridge key |
| TELEGRAM_BRIDGE_TOKEN | Independent random secret >=32 chars, identical on Go and bot; never BOT_TOKEN or JWT_SECRET |
| AUTH_REFRESH_SESSIONS | Feature flag, false until coordinated rollout; then true |
| AUTH_PHONE_ACCOUNTS | Feature flag, false until coordinated rollout; then true |
| AUTH_BROWSER_ORIGINS | Exact `https://bakeu-website-production.up.railway.app`, no slash; comma separated if adding reviewed permanent HTTPS origins |
| TELEGRAM_BOT_USERNAME | Public `BakeUuzBot` |
| TELEGRAM_SITE_URL | Public website/Mini App entry `https://bakeu-website-production.up.railway.app` |
| SELLER_SELF_SERVICE | New business flag, default false; activate separately after owner reviews self-service rule |
| ADMIN_USER_IDS | Optional protected configuration, comma-separated immutable **Go UIDs** of active phone-verified admins; blank denies all moderation |
| RESEND_API_KEY | Optional secret for existing manual shop-review mail |
| EMAIL_FROM, ADMIN_EMAILS | Existing optional mail/review settings; admin emails do not grant new Go moderation rights |
| APP_BASE_URL | HTTPS Go API origin for existing signed review links; retain currently working mail configuration |
| MARKET_REVIEW_SECRET | Existing independent review secret; preserve existing signed-link behavior |

Do not use a public database URL if a private Railway connection is available.
Select the actual published private URI variable; names and reference syntax
vary by the existing Mongo template. No credential or generated URI is invented
in this document. Go needs no BOT_TOKEN.

## Variables — bot runtime

| Variable | Classification / required value |
| --- | --- |
| BOT_TOKEN | Existing secret for @BakeUuzBot; never sent to website |
| ADMIN_IDS | Required comma-separated numeric Telegram admin IDs; distinct from Go ADMIN_USER_IDS |
| PORT, RAILWAY_SERVICE_ID | Generated runtime values; bot binds 0.0.0.0 automatically on Railway |
| API_HOST | 0.0.0.0 if setting explicitly; API_PORT should be unset in production |
| DATABASE_PATH | Required `/data/bakeu.sqlite`; existing volume remains mounted at `/data` |
| MINI_APP_URL | `https://bakeu-website-production.up.railway.app` (exact entry must agree with Go TELEGRAM_SITE_URL) |
| SITE_URL | Same public website for legacy links |
| ALLOWED_ORIGINS | Exact website HTTPS origin; no wildcard; add permanent origins deliberately |
| GO_BACKEND_URL | `https://bakeu-backend-production.up.railway.app` or the same with /api suffix; existing validator requires HTTPS outside loopback |
| TELEGRAM_BRIDGE_TOKEN | Same independent Go bridge secret, runtime only |
| GO_ACCOUNTS_ENABLED | false until Go is ready; true freezes new SQLite registration/profile/shop writes and enables Go phone/Mini App bridge |
| TELEGRAM_ORDERS_ENABLED | Independent orders-menu/worker flag; true after bridge and transactions pass |
| TRUST_PROXY | Keep false on Railway public bind; do not trust client-supplied proxy headers |
| SESSION_HOURS | Optional legacy SQLite session TTL (default24) |
| TELEGRAM_URL, INSTAGRAM_URL, SUPPORT_EMAIL | Optional public footer/menu links |
| USE_WEB_APP | Legacy launch option; npm run miniapp explicitly uses Mini App mode |

Check from a private bot runtime shell: `npm run miniapp:check` (schema/config,
no Telegram call), then `npm run bridge:check -- --configured` (GET-only preflight with existing connection settings and feature flags still off;
no actor, notification lease or send). Do not paste full process environment,
connection strings, tokens or personal records into logs/support chats.

## Variables — website build vs runtime

| Variable | Phase / intended production value |
| --- | --- |
| VITE_GO_API_URL | **Build, public** `/api` for same-origin gateway |
| VITE_ACCOUNT_API_URL | **Build, public** `/api` |
| VITE_GO_PHONE_ACCOUNTS | **Build feature flag** false before cutover, true only in coordinated Go build |
| VITE_GO_BACKEND_URL | Optional legacy standalone orders override; leave unset when shared VITE_GO_API_URL is configured |
| VITE_TELEGRAM_BOT_USERNAME | Optional public fallback `BakeUuzBot` |
| WEB_GO_API_URL | Runtime upstream: public Go HTTPS /api above, or `http://<actual-private-host>.railway.internal:<actual-Go-PORT>/api` using real Railway references |
| WEB_BOT_API_URL | Runtime upstream: public bot HTTPS /api above, or actual private bot host+PORT/api |
| WEB_ALLOWED_ORIGINS | Runtime exact website HTTPS origin(s) |
| WEB_ACCOUNTS_MODE | Runtime safety gate `legacy`, then `go` only with Go-enabled same-origin dist metadata |
| PUBLIC_SITE_URL | Optional runtime origin fallback if WEB_ALLOWED_ORIGINS unset |
| PORT | Railway-generated runtime port |
| WEB_DIST_DIR | Optional runtime dist directory (default dist); keep default Docker layout |
| VITE_DEV_PORT, VITE_BOT_API_PROXY_TARGET | Development only; not production API routing |

Every VITE_* value is public and compiled into dist. Runtime changes to those
variables do not change an already built bundle. Rebuild explicitly and check
`/bakeu-build.json` (contains public flags/URLs only). `WEB_ACCOUNTS_MODE=go`
refuses a stale build or cross-site Go-cookie configuration. In Go mode legacy
registration URLs are still explicitly forwarded to Node and must return the
truthful GO_ACCOUNTS_REQUIRED409 once its cutover flag is set, never SPA HTML.

## Ordered activation (manual, after PR review + approval)

1. Record deployed commits/flags and verified restorable Mongo+SQLite backups.
   Complete read-only inventory and existing-user recovery decisions. Preserve
   original volumes, sessions and source IDs; do not merge on profile phone alone.
2. Deploy reviewed Go source first with existing protected settings, exact browser
   origins and the independent bridge secret. Verify /healthz AND /readyz. Keep
   business/cutover flags off while inspecting topology and counts. Existing
   indexes must be reviewed against inventory; duplicate-index startup failures
   require investigation, not deleting records to make startup pass.
3. Deploy reviewed bot source from `/src/bot` with the matching bridge secret and
   correct Go URL, same volume and public Mini App URL. Initially keep cutover
   flags off. Run miniapp:check. Verify no imports escape this Docker context.
4. Deploy the website gateway with WEB_ACCOUNTS_MODE=legacy and matching public
   build settings, or stage a Go-enabled build behind controlled access. Verify
   static pages, JSON API errors, redirects rejected and /healthz. Runtime URLs
   must reach the actual Go/bot PORTs. Do not point API calls at static-only hosting.
5. In a short coordinated maintenance window enable Go AUTH_REFRESH_SESSIONS and
   AUTH_PHONE_ACCOUNTS, then bot GO_ACCOUNTS_ENABLED and TELEGRAM_ORDERS_ENABLED.
   Run bridge:check: ready, phoneAccounts=true, refreshSessions=true. Old SQLite
   rows are preserved but new customer/seller identity writes are frozen.
6. Rebuild website with VITE_GO_PHONE_ACCOUNTS=true, VITE_GO_API_URL=/api and
   VITE_ACCOUNT_API_URL=/api; use WEB_ACCOUNTS_MODE=go. Confirm build metadata
   matches. Avoid leaving old open browser tabs silently writing legacy identity;
   stale bundles now receive explicit409 and need refresh.
7. Run the live acceptance checklist using owner-approved accounts. Enable
   SELLER_SELF_SERVICE only after the owner explicitly accepts verified automatic
   activation. Leave existing pending/rejected/suspended shops under moderation;
   no imported legacy seller is automatically approved. Configure Go admin UIDs.
8. Observe categorized logs, readiness, notification pending/failed/uncertain
   states and record counts. Resolve uncertain sends manually; never bulk reset
   sent/sending/uncertain state or auto-resend after an ambiguous Telegram timeout.

## Outbox diagnosis

The old generic line cannot establish its production cause. New logs expose only
component, stage, category, HTTP status and repeat count (at most once/minute per
key); claim retries back off up to60s, and receipt retries remain durable. Legacy
SQLite and Mongo workers run independently. `bridge_unauthorized/401` suggests
mismatched credentials; `route_missing/404` suggests route/deployed-version/URL;
`dns`, `tls`, `connection_refused`, `transport_timeout` distinguish network;
`invalid_json`/`invalid_contract` require response-contract investigation;
`upstream_unavailable/5xx` requires checking Go readiness and protected logs.
These are diagnostics to verify, not claims about the currently deployed failure.
Never log or request raw Authorization, customer payloads or full errors with URLs.

## Live acceptance checklist (all still pending)

- Public HTTPS website and Mini App entry, branding and mobile navigation; RU/UZ.
- Bot /start, buyer/seller buttons, signed initData; unsigned input rejected.
- Go liveness + transaction readiness; Mongo and SQLite volumes survive restart.
- Approved test customer AND seller: own-contact OTP, one UID/binding/verified
  phone, duplicate registration/replay rejected, Mongo users count increases once,
  SQLite customer count stays unchanged; no private fields in logs.
- Browser reload refresh, rotation, logout/re-login, logout-all, frozen denial;
  Mini App yields the exact same Go UID and never restores another account.
- Public catalog/category/search/product/shop/map use actual Mongo records/GPS;
  missing catalog fails visibly instead of presenting demo stores.
- Favorites, variants and revision-safe cart survive reload; guest data is not
  silently merged; account switch and stale clear cannot affect a different user.
- Verified customer opens own shop with name, verified phone, address and map/GPS;
  UID/purchases remain, no foreign ownership, pending/rejected/suspended bypass.
- Admin UID allowlist, suspend hides catalog/blocks new orders; owner cannot undo
  moderation; real seller products/orders/revenue/notifications, no demo metrics.
- Multi-shop checkout server prices/variants, independent fulfillment and future
  slots, idempotent retries, matching buyer/seller history after process restart.
- Real linked seller Telegram notification and buyer status update, inspect Mongo
  receipt; failed delivery is not marked sent; no unexplained recurring failures.
- Exercise expected400/401/403/404/409 validation and no accidental405/SPA HTML.
- Count/reference reconciliation, observe first registration and order in real DB.

## Rollback

Preserve both volumes and all Go accounts/orders/mappings. Roll back source/build
only to a reviewed compatible commit with current schema/session contracts. Turn
SELLER_SELF_SERVICE off to stop new promotions; do not demote existing owners or
change their UID. If new Go accounts exist, **do not re-enable SQLite account
writes** as a shortcut. Keep Go identity and disable new signup/checkout behind
maintenance messaging while fixing upstreams. A return to legacy requires an
explicit identity reconciliation plan and backup verification, not flag flipping.
Stop the bot orders flag if necessary without changing durable notification rows;
restore worker with same data/secret, reconcile ambiguous sends before retry.
Database restoration needs separate approval and reconciliation of writes made
since the snapshot; never overwrite live data with an old dump automatically.

On a permanent domain, update Go AUTH_BROWSER_ORIGINS/TELEGRAM_SITE_URL, bot
MINI_APP_URL/SITE_URL/ALLOWED_ORIGINS, gateway WEB_ALLOWED_ORIGINS/PUBLIC_SITE_URL,
Telegram Mini App/BotFather URL, mail/link settings and any external CORS. Keep
/api build URLs relative; any absolute VITE_* URL change requires rebuild. Refresh
cookies do not migrate between domains; re-authenticate safely on the new origin.

## Human blockers

Railway requests were rejected by the execution proxy before reaching services;
Railway API/runtime credentials, logs and backup snapshots were unavailable.
Needed: owner-managed Railway access (no tokens in chat), verified backup restore,
actual private URI/PORT references, live bridge diagnostics and deployed commits,
legacy-account recovery decisions, self-service rule/admin UID approval, real
Telegram test delivery and a separate production deployment/migration approval.

# Marketplace P0 — coordinated staging review

24 November 2026 (Asia/Tashkent). **No production migration, deploy, merge or
live-data deletion is part of this change.** This is P0, not completion of P1–P5.

Use **`codex/marketplace-p0-20261124` in both repositories**. Website and Bot share
BakeU.UZ; the Go service uses BakeU-Backend. These branches include the earlier
`codex/phone-only-auth-20261124` commits. Do not combine the new website with
old Go `main`, or select the alternative synthetic-email signup branch.

## Result and API contract

| Area | Behavior |
| --- | --- |
| Registration | Buyer: firstName, lastName, phone. Seller: the same plus marketName, address, lat, lng. No email/password, synthetic email or password hash for new accounts. |
| Phone proof | Actual Bot handler rejects foreign/forwarded/missing-owner contacts in private Telegram chats; Go stores the pending proof, then consumes the one-use code transactionally. No account/shop exists before proof. |
| Seller | Verified registration opens an approved shop with its owner UID and selected point, without an application. Existing moderation decisions are never bypassed. Verified buyer/draft activation keeps the original UID/history and now stores consistent first/last names; an empty legacy fulfillment defaults to pickup. |
| Session | Shared in-memory access token and Secure/HttpOnly refresh cookie. Website reload, full browser close/reopen and Go process restart keep the same account. Mini App uses verified initData → Bot → one-use Go ticket → that same Mongo UID. |
| Product writes | POST/PUT validate a finite positive base/variant price **<= 1,000,000,000,000 UZS**, the same bound as single-unit checkout. Client-owned IDs, ratings and archive flags are not accepted from the editor payload. |
| Product media | Existing multipart/GridFS flow, real image URLs/thumbnails. UI validates file type/size; Go sniffs content and enforces five-image cap/ownership/body limit. No demo cake image is presented as a missing real map photo. |
| Product deletion | DELETE retains HTTP 204 but **archives**, setting deletedAt/available=false. The Mongo document, GridFS files and historical order snapshots remain. Public/owner listings, reads, edits, image uploads, counts and subsequent checkout exclude archived listings. Existing order status/history still works. No existing products are bulk-archived. |
| Legacy fields | All market ReplaceOne paths use bounded `$set` patches. Moderation includes status/timestamp CAS and atomic actor event; owner/createdAt/unknown metadata survive. No collection rewrite, automatic approval or cleanup job was added. |
| Active statistics | pending, accepted, preparing, ready, delivering and legacy out_for_delivery share one definition for total, breakdown and chart. Completed/delivered/cancelled/rejected and other sellers are excluded. |
| Demo | Main Admin remains a separate demo pending P1. Its MongoDB disclaimer is always visible, including inside Telegram. Real public Go catalog errors/empty results never become seeded listings. |

New price/archive behavior applies to **future requests only**. Existing unusually
priced products, account documents, orders, SQLite identities and sessions are
not rewritten. Such legacy listings may be corrected intentionally by their owner.

Existing endpoints retained:

- `POST /api/auth/phone/start`, `/verify`, `/telegram`; `POST /api/auth/refresh`, `/logout`.
- Bot-only `/api/integrations/telegram/auth/phone/contact` and `/auth/launch`.
- `POST /api/market/self-service`, `PATCH /api/market/mine`.
- Product `POST /api/products`, `PUT /api/products/:id`, `POST /api/products/:id/image`.

Behavior changes: product POST/PUT reject excessive/non-finite/non-positive prices;
DELETE `/api/products/:id` archives; GET `/api/products[/:id]` hides archived records;
GET `/api/seller/dashboard` returns all six active breakdown keys. Market moderation
PATCH `/api/admin/markets/:id/status` preserves unmodeled legacy fields. No new
public service-credential endpoint or unrelated Admin API was added.

The full phone payload/ownership/index specification remains in
[PHONE_ONLY_AUTH.md](PHONE_ONLY_AUTH.md). Legacy credential login and existing
sessions remain for compatibility; the coordinated phone-mode UI has no credential
registration/login fields. Editable legacy phone text alone never claims an old
account. No automatic SQLite → Mongo identity merge is performed.

## Tests and reproduction

Use Node 24, Go 1.26.4, a **fresh disposable MongoDB 8 replica set** and an additional
standalone fixture for readiness tests. Never point tests at Railway, an existing
volume or a production tunnel. Go integration tests only create/drop randomized
fixture databases on the explicit loopback test URI.

```sh
npm ci
npm run test:integration
npm --prefix src/bot test
npm run lint
VITE_GO_API_URL=/api VITE_ACCOUNT_API_URL=/api VITE_GO_PHONE_ACCOUNTS=true npm run build
```

In the Go checkout:

```sh
BAKEU_TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' \
BAKEU_TEST_STANDALONE_MONGO_URI='mongodb://127.0.0.1:27018/?directConnection=true' \
  go test -count=1 -race ./...
go vet ./...
CGO_ENABLED=0 go build -trimpath -o /tmp/bakeu-p0-server ./cmd/server
```

For the combined browser test, generate a temporary **local test** certificate,
install Chromium with `npx playwright install chromium` (CI uses `--with-deps`),
then run from the website repository:

```sh
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /tmp/bakeu-p0.key -out /tmp/bakeu-p0.crt -days 1 \
  -subj '/CN=127.0.0.1' -addext 'subjectAltName=IP:127.0.0.1'
BAKEU_P0_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true' \
BAKEU_P0_SERVER_BINARY=/tmp/bakeu-p0-server \
BAKEU_P0_TLS_KEY=/tmp/bakeu-p0.key BAKEU_P0_TLS_CERT=/tmp/bakeu-p0.crt \
  npm run test:p0:e2e
```

Ports 18881/18884 must be free. The harness owns its Go process, creates a fresh
random database, starts the actual HTTPS website gateway and Bot API, exercises
the real Bot handler/Go/Mongo, closes/reopens a persistent Chromium profile and
restarts its Go process. It includes `test:phone-contract`. It never loads live
credentials, opens a live SQLite DB or contacts Telegram. It closes its own
processes/profile only; retain the disposable Mongo fixture until evidence review.

`BAKEU_P0_CHROMIUM_PATH` can select a preinstalled Chromium executable.
`BAKEU_P0_EVIDENCE_DIR` changes the ignored `test-results/p0` output location.
Fixture secrets are deliberately public/fake and must **never** be used on Railway.

CI: `.github/workflows/marketplace-p0.yml` checks out the matching backend ref,
runs both codebases' tests plus the real browser/Mini App contract. It has no
deployment step. Backend's own workflow runs Mongo integration/race/vet/build.
Local results are in `MARKETPLACE_P0_VALIDATION.json`; GitHub-hosted CI execution
and live staging/real Telegram acceptance are separate checks, not implied by
local success. Tile/search external requests are blocked in local E2E; real
OpenStreetMap provider availability is a staging acceptance item.

## Railway: operator-only staging steps

1. Keep **Production unchanged**. In Railway select the actual **Staging**
   environment. Confirm its Go database, Bot token and volumes are isolated from
   Production before testing any registration. Keep existing service/volume IDs,
   `/data` ownership policy, SQLite file and JWT/bridge secrets; do not recreate
   a volume, reset a database, regenerate identities or use chmod 777.
2. Before enabling phone mode on existing data, privately record user/product/
   order/session counts, known IDs and index definitions; create a backup and
   verify its restore on a separate isolated target. No such live backup/count
   verification has been performed by this code task. Use the reviewed Mongo
   backup/readiness plan; do not restore over an active database.
3. Connect these reviewed branches **only in Staging**, then deploy manually
   when ready (nothing is deployed by this task):

   | Service | Repository / branch | Root / health |
   | --- | --- | --- |
   | Website | BakeU.UZ / codex/marketplace-p0-20261124 | repository root / `/healthz` |
   | Telegram Bot | BakeU.UZ / codex/marketplace-p0-20261124 | `src/bot` / `/health` |
   | Go | BakeU-Backend / codex/marketplace-p0-20261124 | repository root / `/readyz` |

   Preserve the Bot's existing startup command/SQLite volume handling. Its
   Dockerfile's COPY context must remain `src/bot`. Do not start a second polling
   instance using a Production Bot token.
4. Inspect the staging Go image's `/phone-email-index` **read-only** first. If a
   full unique email index blocks missing-email users, follow the exact guarded
   staging-only transition in `PHONE_ONLY_AUTH.md` after the verified backup and
   paused staging auth writers. Startup never drops indexes. Do not bypass the
   environment/database guard or apply any transition in Production.
5. Set the following **Staging-only** variables, keeping credential values private:

   | Service | Variables |
   | --- | --- |
   | Go | AUTH_PHONE_ACCOUNTS=true; AUTH_REFRESH_SESSIONS=true; SELLER_SELF_SERVICE=true; AUTH_BROWSER_ORIGINS=https://bakeu-website-staging-stading.up.railway.app; TELEGRAM_SITE_URL and APP_BASE_URL that same website origin; TELEGRAM_BOT_USERNAME the actual staging bot; existing distinct TELEGRAM_BRIDGE_TOKEN and JWT_SECRET; explicit staging MONGODB_URI/MONGODB_DB |
   | Bot | GO_ACCOUNTS_ENABLED=true; TELEGRAM_ORDERS_ENABLED=true if buyer/seller order menus are enabled; GO_BACKEND_URL=https://bakeu-backend-staging-stading.up.railway.app; matching bridge credential; existing staging BOT_TOKEN; MINI_APP_URL/PUBLIC_SITE_URL and ALLOWED_ORIGINS set to the staging website; DATABASE_PATH retains its existing mounted SQLite path |
   | Website build | VITE_GO_API_URL=/api; VITE_ACCOUNT_API_URL=/api; VITE_GO_PHONE_ACCOUNTS=true |
   | Website runtime | WEB_ACCOUNTS_MODE=go; WEB_GO_API_URL=https://bakeu-backend-staging-stading.up.railway.app; WEB_BOT_API_URL=https://bakeu-bot-staging-stading.up.railway.app; WEB_ALLOWED_ORIGINS=https://bakeu-website-staging-stading.up.railway.app |

   VITE flags require a **rebuild**. No token, password, bridge credential or
   Mongo URI belongs in VITE variables. Origins contain no `/api` or trailing
   path; upstream settings above use the origin only. Website/Mini App share
   that HTTPS website origin/gateway and the same Go service/database.
6. Require website `/healthz`, Bot `/health` and Go `/readyz` HTTP 200. Go readyz
   must confirm transactions, not only a successful Mongo ping. Do not bypass
   Mongo replica readiness, change its start command or reinitialize its replica
   set as part of P0. If readiness/index inspection fails, stop this rollout.
7. On staging-only test accounts, confirm buyer/seller proof, foreign/forwarded
   contact refusal, one verified phone/one UID, no user/shop before proof, exact
   map point, same UID after phone login and Mini App launch. Reload, close/reopen
   browser and restart the **staging** Go service; compare preserved IDs/history.
8. On a newly created staging fixture product only, create/edit/upload/archive;
   verify its raw Mongo document, GridFS and old order snapshot remain. Check
   the six active statuses, cross-seller isolation and unchanged legacy fields
   after an authorized moderation decision. Never use existing customer products
   as destructive acceptance fixtures.
9. Reconcile the private before/after inventory and review CI/E2E evidence before
   any next rollout decision. P1 Admin/chat/follows/billing are not implemented by
   P0, and a successful P0 is not permission for a Production deploy.

# Frontend + Bot phone-only account contract — 24 November 2026

Branch `codex/phone-only-auth-20261124`, based on website `Amin/3ca0df0`.
Backend changes are in the matching branch of `muhammadamin16/BakeU-Backend`.
No remote deploy, variable/index change, merge or production write was performed.

## Changes

Go registration previously sent combined `name` without credentials while Go
still required email/password. This branch sends the coordinated contract:

- Buyer: `purpose: register`, `role: customer`, `firstName`, `lastName`, `phone`.
- Seller: those fields with `role: seller`, `marketName`, required `address`,
  explicit finite `lat`/`lng`. Address edits clear the previous map point.
- Login: `purpose: login`, `phone`, followed by the same real Bot/code proof.

There are no email/password inputs in the Go flow and none are sent by its
payload builder. Seller-specific fields and client-supplied identity claims
are stripped from buyer/login payloads. The buyer and seller share one Go
identity/session system; a duplicate proven phone cannot create another UID.
The backend creates an approved shop atomically only after own-contact/code
verification; the seller submits no additional application.

The existing map picker supports explicit map click, confirmed address search,
or user-granted geolocation. No default map center is submitted as a selection.
The pending proof survives reload in sessionStorage, per login/register purpose.
Only id, expiry and a validated matching `https://t.me/<bot>?start=goauth_<id>`
link are saved there, never the form, phone, code, password or session JWT.
Expired/malformed proofs are discarded; blocked storage still permits in-memory
verification. Refresh-cookie/session storage and account notifications are reused.

Bot confirmation requires a private Telegram actor and its own `contact.user_id`;
foreign/missing-owner/forwarded contacts cannot call the Go contact API. The
protected bridge credential remains server-side. In Go mode, unlinked order menus
open phone login/registration rather than the legacy password-link flow. Seller
settings also recover an expired session through phone/Telegram login. New customer/seller accounts
are written only by Go to MongoDB; SQLite retains its existing admin/UI state
and records, with no new customer inserted by this flow.

Older fallback/auth clients are retained for compatibility while feature flags
are coordinated. Enable Go mode across all three services for these new flows;
do not enable the website flag against an older Go handler. Existing account
IDs/orders/sessions are not migrated, deleted or silently merged by this change.
Unverified legacy profile phone fields alone are insufficient ownership proof.

## Backend index gate and staging rollout

Read the matching backend
[PHONE_ONLY_AUTH.md](https://github.com/muhammadamin16/BakeU-Backend/blob/codex/phone-only-auth-20261124/docs/production/PHONE_ONLY_AUTH.md).
Its full unique email index must be explicitly rehearsed/replaced on **staging**
with a partial unique nonempty-email constraint, preserving existing real emails.
Backend startup never removes that index automatically; phone mode fails with
`PHONE_EMAIL_INDEX_MIGRATION_REQUIRED` until the reviewed transition is complete.
The guarded index CLI is read-only by default, and applies only with explicit
staging environment/database confirmation. It changes indexes, never documents.
No live index transition has been performed here.

After review and backup verification, coordinate these **staging-only** settings:

| Service | Settings |
| --- | --- |
| Go | `AUTH_PHONE_ACCOUNTS=true`, `AUTH_REFRESH_SESSIONS=true`, `SELLER_SELF_SERVICE=true`, exact website Origin, existing protected bridge token, actual Bot username |
| Bot | `GO_ACCOUNTS_ENABLED=true`, staging `GO_BACKEND_URL`, matching bridge secret; retain existing Bot token/SQLite volume |
| Website build | `VITE_GO_API_URL=/api`, `VITE_ACCOUNT_API_URL=/api`, `VITE_GO_PHONE_ACCOUNTS=true` |
| Website runtime | `WEB_ACCOUNTS_MODE=go`, staging-only Go/Bot upstream URLs, exact website Origin |

Keep JWT/Bot/bridge credentials and existing data; put no credential in VITE_.
The backend guide covers preserving existing accounts, old pending proofs,
restart/session checks, index rollback limits and post-review live acceptance.
No setting above was applied remotely by this branch.

## Tests and reproduction

```sh
npm ci
npm --prefix src/bot test
npm run test:integration
npm run lint
VITE_GO_API_URL=/api VITE_ACCOUNT_API_URL=/api VITE_GO_PHONE_ACCOUNTS=true npm run build
```

The committed contract test calls the **real Go API and Bot handler** against
a disposable local Mongo replica set, using fixed fake credentials and an
in-memory SQLite fixture. It refuses non-loopback Go URLs; the fake bridge
preflight must succeed before any registration request. Use the backend fixture
instructions; never point it at a live staging/production service or tunnel.

Configure that fixture with `AUTH_PHONE_ACCOUNTS=true`,
`AUTH_REFRESH_SESSIONS=true`, `TELEGRAM_BOT_USERNAME=BakeUuzBot`, the fixed
`TELEGRAM_BRIDGE_TOKEN=local-test-telegram-bridge-secret-at-least32`,
`AUTH_BROWSER_ORIGINS=https://phone-contract.test`, an explicitly disposable
Mongo database, and a fake JWT secret. Wait for `/readyz` 200, then:

```sh
BAKEU_PHONE_CONTRACT_GO_URL=http://127.0.0.1:18681 npm run test:phone-contract
```

It proves both roles, matching map fields, protected real bridge calls, forwarded
contact rejection, one-use code, duplicate phone rejection, same-UID login and
preserved earlier refresh sessions. No real Telegram request is sent. Read the
JSON test result; a nonzero exit or `ok:false` is a failure.

Additional headless Chromium tests used the built website through its real
HTTPS same-origin gateway, actual Go API/Mongo and mocked Telegram transport:
mobile forms, missing map point, address changes, pending-proof reload, buyer/
seller confirmation, Secure/HttpOnly cookie reload after an actual Go process restart, phone login
and phone-based seller session recovery all passed.
Tile/search external requests were blocked in this lab; real provider availability
and actual Telegram delivery remain staging acceptance steps.

## Live staging verification boundary

User-supplied staging hosts:

- Website `https://bakeu-website-staging-stading.up.railway.app` (`/healthz`)
- Go `https://bakeu-backend-staging-stading.up.railway.app`
  (`/readyz`, `/api/products`, `/api/markets`)
- Bot `https://bakeu-bot-staging-stading.up.railway.app` (`/health`)

All five read-only GET attempts were blocked by this execution environment's
proxy (CONNECT 403, destination status 000). This is not a Railway health result.
The owner reported the currently deployed Go readiness/catalog as 200; the new
branch is undeployed. Full live staging/real Telegram acceptance remains pending
an operator-reviewed rollout. Do not merge/deploy or touch production automatically.

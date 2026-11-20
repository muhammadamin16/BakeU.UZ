# Telegram orders integration — handoff

Current branch: `codex/telegram-buyer-seller-menu`, based on `Amin` at `f774e6d` (includes the PR #6 Railway build-boundary fix).
Backend inspected read-only: `BakeU-Backend/main` at `489d20e`.

The current menu revision is described in [the buyer/seller menu handoff](./MENU-UPDATE.md). `PULL_REQUEST.md` and the original validation record describe the earlier PR #5 and are historical, including its superseded role-only main menu.

## What this branch implements

- Existing winter welcome, Mini App link, social/support/email/about navigation and numeric-ID admin permissions remain in place.
- Both **Мои заказы** and **Я продавец** are visible to everyone; the old **Мой BakeU** button is removed. Every private action still requires a confirmed backend identity and the matching buyer/seller role. A backend outage cannot reveal private data.
- A private own-contact check and E.164 normalization start a short-lived account-link challenge. Phone matching does not grant access. The authenticated website must prove ownership before the bot receives a confirmed identity.
- Seller shop statistics, products, all-orders/status lists, numbered current-page selection, snapshot details, contact/location, refresh/back navigation and guarded status buttons. Buyers get server-backed all/active/history lists. Every private action reloads backend identity and checks ownership; both owning buyer and seller can explicitly open the saved delivery location.
- Server-to-server API adapter and TypeScript declarations; notification worker consumes server leases, records Telegram receipts and distinguishes retryable rejection, blocked, failed and uncertain delivery.
- Separate website client and React components for server orders/progress, a server notification inbox, link confirmation, delivery address/date/time/comment, opt-in map and GPS. These components do not use SQLite, localStorage or legacy account tokens.
- Offline unit/HTTP adapter tests. No real Telegram messages, production database writes or deployments were performed.

## What still needs the backend owner

At the inspected commit, Go already provides authenticated `/api/me`, `/api/orders`, seller market/products/dashboard and seller order-status writes. It has five order states and accepts only product quantities plus a delivery address at checkout. It does **not** provide verified Telegram binding, the bridge endpoints, a Mongo notification outbox/inbox, nine-state transitions/history, delivery scheduling/coordinates, or the V2 capability contract.

This branch therefore does not claim that an order already travels end to end through production MongoDB and Telegram. Missing endpoints fail visibly; there is no fake successful order, local order database or fallback to a phone match. The integration is off by default. Go/Mongo/auth files were not edited, and no branches were merged.

The other Codex should implement [the exact backend contract](./BACKEND-CONTRACT.md), then mount the components using [the website integration instructions](./WEBSITE-INTEGRATION.md). The existing legacy website checkout/profile and Node/SQLite account system have deliberately not been replaced in this parallel branch. Until mounting is complete, those existing screens retain their existing behavior; the new server components are not routed publicly.

## Enable only after integration

Add these server-only settings to the existing bot environment; do not overwrite its token, admin IDs or database:

```dotenv
TELEGRAM_ORDERS_ENABLED=true
GO_BACKEND_URL=https://your-go-backend.example
TELEGRAM_BRIDGE_TOKEN=separate-random-service-secret-at-least-32-characters
```

Keep the flag `false` until the contract and website confirmation route are ready. `GO_BACKEND_URL` may include a trailing `/api`; HTTPS is required except on loopback in local tests. The bridge secret must differ from `BOT_TOKEN`, must be checked by Go with its own service-auth middleware, and must never use a `VITE_` prefix or enter a browser bundle. Reuse the existing bot process; do not start two polling processes with one bot token.

The existing bot's SQLite remains only for its pre-existing accounts/admin/support/poll cursor/legacy notifications. The new commerce integration never queries it for an order or a shared user identity. It stores only expiring UI selection references (at most five order IDs, actor UID/shop ID and page/filter), never order snapshots, prices, phone numbers or histories. Selection rechecks the current Go identity and fetches the order again. The parallel backend migration owns removal of legacy account paths; this branch does not migrate data.

## Validation and acceptance

Run from the website repository:

```sh
npm ci
npm run bot:test
npm run build
npx --no-install eslint src/bot/orders src/telegramOrders src/bot/handlers/router.js src/bot/handlers/public.js src/bot/keyboards/mainKeyboard.js src/bot/index.js src/bot/tests/telegramOrders.test.js
```

The automated fixtures use fake transports and a loopback HTTP server **only inside tests**. They cover roles/admin regression, contact ownership versus account proof, foreign order/location denial, legal/illegal/stale/duplicate actions, pickup, server-history reload after handler recreation, escaping and Telegram limits, notifications/ACK retry and Telegram failure classification, real HTTP adapter headers/404 behavior, website ownership/link proof and V2 write gating. They do not prove Mongo persistence or production Telegram delivery.

See [the recorded validation results](./VALIDATION.md) for test counts and the separate browser/component build checks.

Before enabling in a shared staging environment, verify with the backend owner:

1. Link an existing buyer and seller through own-contact plus authenticated account proof; test expiry, replay, conflicting Telegram/account bindings, changed role and a frozen account.
2. Submit a real multi-seller checkout twice with one idempotency key: one order per shop, authoritative price/contact snapshots, same returned IDs, durable history/inbox/outbox.
3. Receive seller and buyer Telegram notifications, change the same order from website and bot concurrently, observe CAS conflicts and the same status/history in both accounts.
4. Restart bot/backend, log out/in and verify old orders remain in Mongo. A second seller cannot read/mutate the first seller's order or receive its location.
5. Exercise delivery and pickup, invalid/future dates, no-location address, denied GPS, Telegram 403/429/timeout, expired sending lease and delayed ACK. A Telegram outage must never roll back or delete an order.

No Railway deployment, production migration, paid SMS, force push or automatic merge belongs to this branch.

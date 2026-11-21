# Implemented Go integration and activation

The missing bridge is now implemented in `muhammadamin16/BakeU-Backend`, branch `codex/telegram-backend-integration`, based on the latest order-history main (`ccdfc8f`). This website/bot branch `codex/connect-telegram-backend` preserves the parallel storefront/shared-session work and connects the account-proof and server-order UI. Earlier handoffs describing missing endpoints are historical; do not deploy only one side and assume the live integration is enabled.

## What is connected

- The same existing Go/Mongo users, markets, products and orders power bot identities, shop/products, own numbered order lists, guarded nine-state actions and owned saved location.
- Phone contact starts a one-time challenge. `/#/telegram/link?challenge=...` now exists: fresh login/password proof binds the existing authenticated Go UID and checks the same phone/role. No account is created or merged on phone match. A seller needs an existing real market/application.
- `/#/account/orders` provides authenticated server history, live progress/status actions, persistent inbox, profile fields and a real approved-product checkout split by seller. Each shop has independent fulfillment, date/time/comment and optional GPS; prices come from Go. Pickup strips address/GPS. Checkout retries reuse the same key and only a committed response clears selection.
- When `VITE_GO_API_URL` is configured the pages reuse the existing shared `goAccount` browser session, and the existing seller storefront editor remains available in the account page. Otherwise runtime discovery can use an in-memory Go JWT without borrowing any Node/SQLite/demo session. Reload requires login in that mode, while Mongo history remains intact.
- `/#/shop/:id` displays the public Go storefront/products. Existing local/demo pages are preserved; the new server order page and its checkout create real Mongo orders. The older browser-only checkout is not a migration source for real orders. An entry link is added on the existing orders page.
- Bot runtime stays inside Root Directory `src/bot`. GET `/api/telegram/config` exposes only `{enabled,apiBase}` for website discovery, never the shared secret. Startup logs whether orders are enabled.

## Railway configuration after review

Keep existing Mongo URI/database, JWT secret, bot token, admin IDs and persistent volumes. Do not replace them with test values.

Go backend:

```dotenv
TELEGRAM_BRIDGE_TOKEN=<new-protected-random-secret-at-least-32-characters>
TELEGRAM_SITE_URL=https://bakeu-website-production.up.railway.app
```

Bot (Root Directory `src/bot`):

```dotenv
TELEGRAM_ORDERS_ENABLED=true
GO_BACKEND_URL=https://YOUR-GO-BACKEND.up.railway.app
TELEGRAM_BRIDGE_TOKEN=<same-protected-secret>
MINI_APP_URL=https://bakeu-website-production.up.railway.app
```

Use the actual public Go URL, not the website or bot API URL. The Go secret must be separate from BOT_TOKEN and JWT_SECRET and must never be pasted in source/chat or a VITE variable. A local operator can generate it with `openssl rand -hex 32`. If using `https://bakeu.uz`, set both MINI_APP_URL and TELEGRAM_SITE_URL to that exact website origin/path.

The new website pages can discover the public API address from the bot via existing VITE_ACCOUNT_API_URL. Optional `VITE_GO_BACKEND_URL` overrides discovery for standalone integration. Prefer the project's existing `VITE_GO_API_URL` when the shared Go browser session is configured: it requires AUTH_REFRESH_SESSIONS=true, exact AUTH_BROWSER_ORIGINS and a same-site HTTPS API/same-origin proxy, as documented by the shared-session implementation. The discovery/in-memory mode can use a separate HTTPS Railway API without refresh cookies. No service secret belongs to the frontend.

Deploy/review the backend and website/bot together before setting the flag true. Those environment changes/deployments were not performed by this development task. An ordinary /start refreshes Telegram's menu once the running bot is updated. Historical messages do not update themselves.

## Verified

- All Go tests, including real Mongo replica-set transactions and the new Telegram order integration, pass. Tests use disposable loopback databases and preserve the first Codex's pointer timestamps/history and legacy status API.
- 59 bot tests and 3 existing shared Go-session tests pass; scoped ESLint, website build and bot-only deployment regression pass.
- Headless Chromium + real Go HTTP + real disposable Mongo: browser account proof, two-shop checkout, authoritative prices/GPS/pickup, website seller acceptance, buyer live refresh, history after relogin, bot reads/location and durable worker/ACK dedup pass. Telegram itself was simulated; no real bot messages were sent.
- No production DB changes, account import, force push, automatic merge or production deployment was performed.

Existing SQLite/demo accounts are not automatically server accounts. Use the existing Go account credentials for proof; migration requires a separate verified identity process, never copying plaintext passwords or matching arbitrary phone numbers.

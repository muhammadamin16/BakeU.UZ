# BakeU Frontend

React + Vite website, Admin UI and Telegram Mini App **browser interface**.
This repository contains frontend code only. Accounts, permissions, MongoDB,
photos and orders are served by the separate `BakeU-Backend` API. The Telegram
Bot is a separate application; its server, token and SQLite do not belong here.

## Start on your laptop

Install Node.js **24+**. Open PowerShell in this repository:

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Copy `.env.example` only when creating a new `.env.local`; keep any existing
personal settings. Open the **Local** URL printed by Vite. The default is
`http://localhost:5173/`; Windows-reserved or occupied ports use an available
fallback. Admin is the same address with `/#/admin`. To open it directly:

```powershell
npm.cmd run dev:admin
```

Frontend development itself needs **no Docker or database**. To use accounts,
catalog, chat and Admin data, start your Backend separately and set its actual
local address in `.env.local`:

```dotenv
VITE_API_URL=/api
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:38119
```

`38119` is an example matching the existing local Backend setup. Change it if
your API listens elsewhere. Add the exact printed website Origin to the
Backend's allowed browser origins. Use `localhost` in Chrome/Edge for the local
Secure-cookie session flow. Restart Vite after configuration changes.

Admin authorization is checked by Backend. There is no demo Admin fallback,
default admin password or frontend privilege bypass. An empty/unavailable API
is shown honestly. Phone proof and any local fixture accounts are prepared by
the separate Backend/Bot tooling; this repository does not seed users or start
MongoDB. The old `local:start`, `local:proof`, `bot:*` and `app:*` commands were
removed with those separate applications.

## Folder map

```text
public/              Images, logos, music and other browser assets
src/
  api/               Public configuration, HTTP session and catalog clients
  admin/             Server-backed Admin pages and routing
  components/        Shared UI: navigation, gallery, map picker, winter theme
  orders/            Browser order/account/checkout screens and API adapters
  pages/             Storefront, authentication, profiles, map and messages
  miniapp/           Telegram SDK and Mini App browser-session integration
  store/             Browser state, server favorites and guest-cart helpers
  i18n/, locales/    Russian/Uzbek translations
  platform/          Browser location, clipboard and sharing adapters
  styles/            Shared site styles
scripts/             Frontend port selection, build metadata, static hosting
```

`src/api/legacyAccounts.js` is a **browser HTTP adapter** retained for older
presentation paths; it contains no server/database implementation. Frontend
API modules now use technology-neutral names instead of `Go*`/`telegramOrders`.

## Check changes

```powershell
npm.cmd run check
```

This runs the frontend tests, ESLint and production build. Tests use controlled
HTTP fixtures and do not contact Production or open a MongoDB/SQLite database.
Do not commit `node_modules`, `dist`, `.env.local` or runtime credentials.

## Build and host

```powershell
npm.cmd run build
npm.cmd run preview
```

The output is `dist/`. `preview` is a local static preview; use Vite development
proxy or an actual reverse proxy to access `/api`.

For Docker/Railway or a Node static host, `npm start` serves the built frontend
and forwards public API requests to **explicitly configured external services**:

```powershell
$env:BACKEND_URL="http://127.0.0.1:38119"
$env:WEB_ALLOWED_ORIGINS="http://localhost:8080"
npm.cmd start
```

`GET /healthz` reports frontend hosting health, not database readiness. Without
`BACKEND_URL`, API requests return a JSON configuration error rather than
connecting to a hardcoded Production service. Hosting is not a Backend: it has
no account/business logic, database driver, seed, worker or Bot implementation.

See [API and hosting configuration](docs/API.md) for Telegram endpoints and
public/runtime settings. Existing site design, gallery, translations and Admin
screens use the same external contracts; no Production deployment is performed
by installing or building this repository.

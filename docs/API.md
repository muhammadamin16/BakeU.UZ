# Frontend API and hosting

## Public build settings

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `/api` | Marketplace Backend API base |
| `VITE_MINIAPP_API_URL` | `/api` | Mini App launch/legacy browser API base |
| `VITE_DEV_PORT` | `5173` | Preferred Vite port; printed Local URL is authoritative |
| `VITE_BACKEND_PROXY_TARGET` | `http://127.0.0.1:38119` | External API for the local Vite proxy |
| `VITE_MINIAPP_PROXY_TARGET` | Backend proxy target | Optional external Bot HTTP API for `/api/miniapp/*` |

Only public URLs/flags belong in `VITE_*`. Mongo URI, JWT signing key, Bot token,
bridge credential and verification codes are server-only. Old public
`VITE_GO_API_URL`/`VITE_ACCOUNT_API_URL` names are read by the configuration
adapter for checkout compatibility; new setups should use the names above.
Existing explicit `VITE_GO_PHONE_ACCOUNTS=false` remains an older presentation
flag, not an Admin permission or demo fallback. Normal frontend builds use the
phone flow by default.

## External service boundary

The marketplace API serves `auth/phone/*`, `auth/refresh`, `me`, `markets`,
`products`, `images`, `cart`, `orders`, `favorites`, `chats`, seller statistics
and `admin/*`. The browser does not implement or authorize those operations.
Session refresh uses the Backend's HttpOnly cookie; access tokens stay in
memory. Gallery URLs remain `/api/images/:id`; order snapshots, variants and
pagination envelopes are unchanged.

The Telegram Mini App UI remains part of this frontend. Its signed launch is
verified by the separate Bot HTTP API at `/api/miniapp/go-session`, then a
one-use ticket is exchanged with the same marketplace Backend. The legacy
path name is an external wire contract, not a Go runtime in this repository.
When using separate services, configure the Mini App proxy/host upstream.

`src/orders/domain.js` contains pure browser status/date/coordinate helpers,
not Bot handlers. `src/api/legacyAccounts.js` is only an older browser HTTP
client. Bot polling, SQLite, seed fixtures, MongoDB, Android/iOS projects and
local database launchers have been removed from this repository.

## Static-host runtime settings

| Variable | Meaning |
|---|---|
| `BACKEND_URL` | External marketplace origin; HTTPS or loopback/private Railway HTTP |
| `BOT_API_URL` | Optional external Bot HTTP origin |
| `WEB_ALLOWED_ORIGINS` | Exact comma-separated website Origins; default localhost/127.0.0.1 at PORT |
| `PORT` | Static frontend host port; default `8080` |
| `WEB_DIST_DIR` | Built asset directory; default `dist` |

`BACKEND_URL` and `BOT_API_URL` must not contain credentials, queries or private
paths. `/api` suffix is accepted and normalized. The old `WEB_GO_API_URL` and
`WEB_BOT_API_URL` runtime names remain temporary aliases. There is no default
Production upstream and no legacy/SQLite account routing mode.

The host serves static assets, returns SPA HTML only for page routes, and
forwards public API HTTP/multipart/Socket.IO polling requests. It retains
approved refresh cookies and error status codes, strips forged service actor
headers, refuses upstream redirects and blocks `/api/integrations/*` service
routes. Vite also blocks those private routes and supports WebSocket proxying.
The current browser chat uses Socket.IO polling; a separate external WebSocket
host can be configured by the deployment reverse proxy if that transport is
introduced. Missing upstreams return JSON 503, never demo data or SPA HTML.

Public build metadata is `dist/bakeu-build.json`, schema version 2. Rebuild the
website after public URL changes. It contains only public settings/revision.
A static frontend health response does not claim the Backend/database is ready.

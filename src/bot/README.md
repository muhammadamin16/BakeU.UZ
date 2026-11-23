# BakeU Telegram bot + account server

Node.js **24 LTS** or newer is required (built-in SQLite, fetch, env-file support). No bot npm dependencies and no external database service are needed. Run exactly one polling bot process per token.

## What is included

- Six existing public buttons: BakeU website, Telegram, Instagram, email, support, about; plus both **Мои заказы** and **Я продавец** for the optional shared-Go orders integration. Public buttons do not grant private-data access.
- Website opens with a URL button; set `USE_WEB_APP=true` for an HTTPS Telegram Mini App instead.
- `/start`, `/cancel`, `/id`; numeric-ID-only private admin panel via `/admin`.
- Admin statistics; paginated server customers and sellers; store applications; approve/reject with a reason; support ticket list and replies.
- SQLite users, password hashes, sessions, applications, support, Telegram users, conversation state, polling cursor and notification outbox.
- Server registration/login/profile API, session revocation, validation, request limits, exact-origin CORS and rate limiting.
- Every server registration queues an admin notification. Seller registration also creates a pending store application. The site profile displays its decision and refreshes it every 30 seconds.
- Admin notifications and support replies retry with backoff up to 8 attempts. Use admin “Повторить уведомления” after fixing a blocked bot or unreachable recipient. Counters are real database totals.
- Passwords, session tokens and bot credentials are never included in Telegram notification messages.

## Windows / PowerShell setup

From the repository root:

```powershell
git switch Amin
git pull origin Amin
node --version
npm install
Copy-Item src/bot/.env.example src/bot/.env
Copy-Item .env.example .env.local
```

Do not overwrite an existing `.env`/`.env.local`; merge the needed values instead. In `src/bot/.env`, fill:

```dotenv
BOT_TOKEN=your_token_from_BotFather
ADMIN_IDS=your_numeric_telegram_user_id
MINI_APP_URL=https://bake-u-uz-self.vercel.app
TELEGRAM_URL=https://t.me/your_channel
INSTAGRAM_URL=https://www.instagram.com/your_account/
SUPPORT_EMAIL=your_real_email
```

`ADMIN_IDS` is your personal numeric user ID, not a username, group or channel ID. Obtain it using a trusted Telegram ID tool, or call Bot API getUpdates privately after messaging your bot, before starting polling. Once running, anyone can see their own ID via `/id`; only configured IDs receive admin access. Each admin must open the bot and send `/start` before Telegram permits the bot to send them messages.

Root `.env.local` enables server accounts with `VITE_ACCOUNT_API_URL=/api`. Vite proxies `/api` to `http://127.0.0.1:3001` in development. Set the bot API port to 3001 for this default proxy. Restart Vite after changing frontend env values.

Terminal 1 (repository root):

```powershell
npm run bot:check
npm run bot
```

Terminal 2:

```powershell
npm run dev
```

Register at `http://localhost:5173/#/register`. Open `/admin` **in Telegram** to view the new account, store application and messages. The local website URL is for your computer; bot website users require a real publicly hosted HTTPS website. Never set `SITE_URL` to localhost for other users.

`bot:check` validates configuration and opens/migrates the local SQLite schema without contacting Telegram. `npm run bot` validates the token with Telegram, disables an existing webhook without dropping pending updates, then starts polling and the HTTP API. A token cannot be tested before a real token is supplied. Telegram 409 means another process is already polling the same bot.

## Existing site and demo records

Server mode is enabled only when `VITE_ACCOUNT_API_URL` is set. Without it, existing browser-only registration/login behavior is preserved. Existing demo accounts are not silently uploaded or migrated: create a new server account. Server mode uses the API for signup/login/profile edits; the browser cache is for displaying the profile only. Access tokens stay in sessionStorage; SQLite stores only their hashes. Logout revokes the current server session when online. Sessions expire after `SESSION_HOURS`.

The existing website admin, product catalog, seller shop editor, order/payment and chat flows still use the project's browser stores. Telegram's real account/application database is **not** automatically a shared backend for those other features. The Telegram application's decision is shown in the server user's profile, but does not publish a local catalog shop. Website admin links open the existing admin screen and do not grant server permissions or synchronize its local tables. Email button displays a contact address; it does not send email. No SMTP, payment gateway or unsolicited announcements are implemented.

## API (same HTTPS origin recommended)

| Method | Route                | Body / authentication                                                                                      |
| ------ | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/health`            | service readiness                                                                                          |
| POST   | `/api/auth/register` | firstName, lastName, email, phone, password, role (`client` / `seller`); sellers also company and location |
| POST   | `/api/auth/login`    | email, password                                                                                            |
| GET    | `/api/auth/me`       | Authorization: Bearer SESSION_TOKEN                                                                        |
| PATCH  | `/api/auth/me`       | same authentication; allowlisted profile fields                                                            |
| POST   | `/api/auth/logout`   | same authentication                                                                                        |

Register/login return `{user, token, application}`. Profile returns `{user, application}`. Application status is `На проверке`, `Одобрено`, or `Отклонено`; rejection includes a reason. Registration validates unique email and Uzbekistan phone (+998 plus 9 digits). The HTTP API never accepts a browser-supplied admin role or Telegram admin identity. Admin-only changes run through Telegram ID checks.

## Production

For Railway `/data/bakeu.sqlite` permission errors, see the
[volume-preserving SQLite startup fix](../../docs/production/BOT_SQLITE_PERMISSIONS.md).
The Docker image repairs only `/data` directory ownership, then the bot process
drops to `node` before opening SQLite; the existing volume is retained.

1. Install Node 24 LTS on a VPS. Place the project at `/opt/BakeU.UZ`; create a dedicated `bakeu` service user. Give that user access to the project and ownership of `src/bot/data`. Protect `.env` with mode 600 and keep it out of Git.
2. Set `SITE_URL` to the real HTTPS site, exact `ALLOWED_ORIGINS`, `API_HOST=127.0.0.1`; enable `TRUST_PROXY=true` only behind the supplied Nginx configuration which overwrites `X-Real-IP`.
3. Copy/adjust `deploy/bakeu-bot.service` to systemd. It runs the bot separately from the frontend. Adjust `/usr/bin/node` if your Node installation uses another path. Create the data directory before starting the service. Enable/start with `systemctl enable --now bakeu-bot`.
4. Build the website with root `VITE_ACCOUNT_API_URL=/api`, then `npm run build`. Serve `dist` using your existing HTTPS Nginx virtual host. Add the locations from `deploy/nginx.conf.example` inside it. HTTPS certificates/domain configuration must already be set up for your host.
5. Alternatively run `docker compose up -d --build` from `src/bot` after creating `.env`. The named `bot_data` volume persists SQLite; published API is bound to the host loopback interface. Docker mode uses `TRUST_PROXY=false` and therefore a shared proxy IP rate-limit bucket. Use the host/systemd setup with trusted Nginx for per-client production limits.
6. Back up SQLite regularly. To make a simple filesystem backup, stop the bot first and copy the data directory, then restart; do not copy a live WAL database file on its own. A live backup can use SQLite's backup API. Keep database and token backups private.

The bot uses long polling, so Telegram does not require a public webhook URL. The website API still needs a reachable HTTPS server for public registrations. Static hosting alone cannot run this bot. Rotate a leaked bot token using BotFather; update `.env` and restart. Do not run the same token on your laptop and VPS at once.

## Verification

```powershell
npm run bot:test
npm run build
```

Tests use in-memory SQLite, simulated Telegram calls and a local HTTP server. They never send real Telegram messages. They cover registration, password handling, duplicates, role restrictions, authenticated profile/logout, decision idempotency, support/reply, outbox retry, CORS, config, and main buttons. A live test with your token and real deployment remains necessary.

## Native Telegram presentation

The main menu now includes an original bundled BakeU PNG banner (`assets/welcome.png`) and HTML captions. Public navigation edits the same message/caption instead of posting duplicate menus. `/start` opens a fresh card; older text-only menus still work. Admins get a management button in addition to the six public buttons. Email has a native copy button; support has a visible cancel button. Leaving support cancels the pending input state. Dynamic account/ticket content is HTML-escaped.

Telegram controls button shapes, font, background and emoji rendering. The bot uses standard supported emoji and native inline buttons, without requiring Premium emoji IDs. Photo upload uses built-in multipart FormData, with no external media host. If a photo is rejected or the file is unavailable, the main menu falls back to text. Existing database, `.env`, tokens, links and permissions are unchanged. Restart the bot after pulling and send `/start` to see the new banner.

## Telegram Mini App

See `../miniapp/README.md` for the winter welcome screen, launch setup, Vercel/VPS deployment and server authorization. Set `USE_WEB_APP=true` with a real HTTPS `SITE_URL` to use the Mini App button and bot menu. Mini App sessions validate Telegram's HMAC-signed `initData` and expire after one hour; new launches must be no older than five minutes. Admin permissions are rechecked against `ADMIN_IDS` on every protected server request. Website password sessions cannot be used as Mini App admin sessions. Existing SQLite data is preserved; a new `miniapp_sessions` table is added automatically.

## Mini App launch update

`npm run bot` now explicitly starts Telegram Mini App mode and uses `https://bake-u-uz-self.vercel.app` by default. Legacy `USE_WEB_APP=false` and an old `SITE_URL` in the private `.env` no longer turn this command into a plain website link. Tokens, admin IDs and the SQLite database are preserved. `npm run bot:check` checks this same launch mode without contacting Telegram. Startup prints the selected public URL and `Telegram Mini App (web_app)`.

If you deploy elsewhere, set optional `MINI_APP_URL=https://your-real-https-site` in `src/bot/.env`. The active Mini App origin is added to the configured CORS allowlist. For the old SITE_URL/USE_WEB_APP behavior, use `npm run bot:website` from the repository root.

After `git pull origin Amin`, stop the previous bot with Ctrl+C, run `npm run bot`, and send `/start` to get a fresh button. Existing Telegram messages retain their original keyboards. Button icons vary by Telegram client; use the printed launch mode or the actual opening behavior rather than the arrow glyph to identify the mode. The HTTPS account/admin API still needs a public backend; this launch fix does not deploy or tunnel localhost.

## Shared Go/MongoDB orders (opt-in)

The separate [Telegram orders integration](../../docs/telegram-orders/README.md) adds public buyer/seller entry buttons with confirmed role checks, account-link challenges, numbered/paginated seller/buyer orders, saved delivery location and a server outbox worker. It is **disabled by default** until the shared Go API and website route implement the documented contract. Commerce data never falls back to this legacy SQLite account database. See the linked handoff for exact backend dependencies, website mounting and staging checks; existing setup sections above describe the legacy account/admin/support service.

## Railway build boundary

Use Railway **Root Directory `src/bot`**, this folder's `Dockerfile`, and repository config `src/bot/railway.json`. The image copies this folder to `/app` and starts `node index.js --miniapp`, repairs only `/data` directory ownership, then drops to the `node` user before SQLite or Telegram access. Its healthcheck is `/health`; Railway supplies `PORT`. Keep the existing environment variables and persistent database volume.

All runtime imports must stay inside this build context, with Linux-correct filename case. The shared pure orders module lives at `orders/domain.js`; the website's `src/telegramOrders/domain.js` re-exports it. Importing `../../telegramOrders/domain.js` from a bot module escapes `/app` and fails even when the orders feature is disabled. The domain implementation is unchanged; only its location/imports moved.

`npm run bot:test` now includes a regression that copies only the deployable bot files into a temporary isolated folder and starts the real entrypoint with `--miniapp --check`, for both orders feature settings. It excludes private environment/data and never contacts Telegram. A local image can be built from the repository root with `docker build -t bakeu-bot-import-fix src/bot`.

The startup fix was also checked in the actual Docker image on Node **v24.22.3**, with networking disabled and a test-only Telegram transport: the real entrypoint bound `0.0.0.0:3000`, `/health` returned HTTP 200, and SIGTERM shut it down with exit code 0. This checks container startup, not live Telegram authentication or production deployment.

## Go bridge implementation

The shared Go bridge now exists in the paired backend integration branch. See [activation](../../docs/telegram-orders/ACTIVATION.md) for actual endpoints, proof/order pages and protected Railway variables. The feature flag remains off until both services are reviewed/configured. The bot-only build boundary remains unchanged.

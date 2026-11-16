# BakeU Telegram Mini App

Mini App starts with the existing winter BakeU logo, original project bear illustration, snow scene, responsive welcome card, and **Magazinga kirish**. The CTA opens the existing storefront at `/#/` without a forced login popup. Existing products, cart, favorites, map, assistant, seller and account pages keep their routes and behavior. A small Mini App bar returns to the welcome screen. Animations respect reduced-motion preferences; the layout supports narrow phones and Telegram content/safe-area insets. No custom Telegram theme or Premium emoji is required.

## Local preview (PowerShell)

From the repository root, on Node 24 LTS:

```powershell
git switch Amin
git pull origin Amin
npm install
npm run dev
```

Open `http://127.0.0.1:3000/#/miniapp` for a **guest** preview. Guests can enter the storefront. Fake Telegram data or query parameters cannot enable admin access. To test genuine Telegram auth, the frontend and API need an HTTPS address reachable by Telegram.

Use root `.env.local` with `VITE_ACCOUNT_API_URL=/api` for local Vite proxying to the bot API on port 3001. Start `npm run bot` in another terminal after configuring the bot token and admin IDs. Existing `.env` files are not overwritten by Git pulls.

## Domain and hosting

Default Mini App frontend: **https://bake-u-uz-self.vercel.app**. Optional custom domain: **https://www.bakeu.uz** after connecting it to the correct Vercel project and setting `MINI_APP_URL`. At the time of implementation the domain returned a Vercel-hosted website; `/api/miniapp/me` returned the same frontend HTML, so API routing was not configured. This repository update alone does not change a Vercel project/domain configuration.

Recommended topology:

```text
Telegram → www.bakeu.uz (Vercel frontend, branch Amin)
                      ↓ HTTPS API
           api.bakeu.uz (VPS, Node 24 bot + SQLite)
```

`api.bakeu.uz` is an example backend hostname: it must be created in DNS and configured with HTTPS before use. Never expose a laptop's localhost address as the public API.

### Vercel frontend

1. In the Vercel project serving `www.bakeu.uz`, connect **this BakeU.UZ repository** and select production branch **Amin** (or explicitly deploy its commit). Verify that this project owns the domain before changing it. Framework: Vite, build `npm run build`, output `dist`.
2. If the API uses its own real HTTPS hostname, add production env `VITE_ACCOUNT_API_URL=https://api.bakeu.uz/api` using the actual backend hostname. Redeploy after changing this variable. This variable contains a public API URL only; **never add BOT_TOKEN as a VITE\_ variable**.
3. Alternatively keep `VITE_ACCOUNT_API_URL=/api` and add a same-origin `/api/:path*` reverse rewrite to the real backend in Vercel. A template is in `src/bot/deploy/vercel.json.example`. Replace its placeholder and copy it to root `vercel.json` only after the backend is ready. Do not deploy the placeholder URL.
4. Vite HashRouter routes (`/#/miniapp`, `/#/admin/telegram`) work with static `dist/index.html`; no catch-all rewrite is required for hash routing. `?miniapp=1` launches the welcome screen; Telegram's temporary launch fragment is consumed before React routing.

### VPS backend

1. Follow `src/bot/README.md` to run the bot under systemd or Docker with persistent SQLite. A laptop bot stops when the laptop sleeps; production needs an always-on server.
2. Run the API on `127.0.0.1:3001` behind an HTTPS Nginx virtual host on the actual API hostname. Use the `/api/` proxy location in `src/bot/deploy/nginx.conf.example`. Its frontend `/` location is only needed if you host the frontend on that same VPS.
3. Allow exact frontend origins in bot `.env`:

```dotenv
SITE_URL=https://www.bakeu.uz
USE_WEB_APP=true
ALLOWED_ORIGINS=https://www.bakeu.uz,https://bakeu.uz,http://localhost:5173,http://localhost:3000,http://127.0.0.1:3000
```

Keep the existing real `BOT_TOKEN` and numeric `ADMIN_IDS`. With trusted loopback Nginx use `TRUST_PROXY=true`; otherwise keep false. The bot token stays only on the backend. Stop the laptop bot before starting the same token on the VPS. 4. A successful `GET https://YOUR-BACKEND/api/miniapp/me` **without** a session returns JSON 401. If it returns HTML, the API URL or reverse proxy is wrong. `GET /health` on the bot server returns JSON readiness. 5. Restart the bot. It sets the Telegram menu button to `BakeU · Магазин`; the main menu's website button also opens the Mini App. Send `/start` to get the new button. The bot must be running with `USE_WEB_APP=true` and an HTTPS site URL.

## Telegram setup

The button URL is `https://www.bakeu.uz/?miniapp=1`. BotFather can also set this as the bot's Main Mini App/Menu Button. The running bot sets its menu button via `setChatMenuButton`; you do not need to paste tokens into the frontend or into chat.

The SDK loads only for a Telegram launch. It calls ready/expand, integrates Telegram's native BackButton, and updates viewport/safe-area CSS variables. If the SDK/network is unavailable, guest storefront browsing remains available. Admin access always needs a successful server verification.

## Authorization and real admin data

- `POST /api/miniapp/session` accepts the raw signed `initData` string only. The backend verifies HMAC-SHA256, timestamp (5 minutes, 30-second future tolerance), duplicate fields, and numeric user identity. `initDataUnsafe`, client role flags and URL admin parameters never grant authority.
- Sessions last one hour; SQLite stores token hashes. Permission is recomputed from `ADMIN_IDS` at each protected request, so removing an admin in server config and restarting takes effect on existing sessions.
- Regular users see the storefront CTA; admins additionally see **Admin panel**. In production every `/admin/*` route is behind the Mini App gate. Opening the URL directly does not grant access. Local development may preview browser-only demo pages as described below; the server-backed Telegram page always requires verified admin access.
- `/admin/telegram` shows real server customers, sellers and store applications, with pagination, approve and reasoned reject. Changes are the same database used by the Telegram bot.
- Other pre-existing website admin/catalog/order/payment/chat pages still use their existing browser/demo stores. This change does **not** replace them with a complete transactional marketplace backend. The UI gate is not a substitute for backend permissions; all new real-data admin endpoints enforce server permissions separately.
- Telegram identity is separate from a website email/phone account. Verified Mini App launch does not silently create fake email accounts, migrate browser profiles or grant a seller role. Users can register/login to the website as usual.

Protected API:

| Method | Route                                          |
| ------ | ---------------------------------------------- |
| POST   | `/api/miniapp/session`                         |
| GET    | `/api/miniapp/me`                              |
| GET    | `/api/miniapp/admin/overview`                  |
| GET    | `/api/miniapp/admin/customers?page=0`          |
| GET    | `/api/miniapp/admin/sellers?page=0`            |
| GET    | `/api/miniapp/admin/applications?page=0`       |
| POST   | `/api/miniapp/admin/applications/:id/decision` |

All routes except session creation require `Authorization: Bearer MINI_APP_SESSION_TOKEN`. Decision body is `{status: "Одобрено"}` or `{status: "Отклонено", reason: "..."}`. Reject reason is required and limited to 500 characters. A completed decision cannot be applied twice.

## Verification

`npm run miniapp:test` runs the frontend render/access checks. `npm run bot:test` covers signature tampering, stale/future launch data, duplicate fields, role escalation, expired sessions, admin revocation, API permissions and decisions, alongside the existing bot tests. `npm run build` verifies frontend production compilation. Server-side React render checks verify logo/CTA and guest versus admin visibility. Full Telegram/browser verification requires the deployed HTTPS frontend and backend plus the real bot token; no real Telegram messages were sent by the automated tests.

## Mini App launch update

`npm run bot` now explicitly starts Telegram Mini App mode and uses `https://bake-u-uz-self.vercel.app` by default. Legacy `USE_WEB_APP=false` and an old `SITE_URL` in the private `.env` no longer turn this command into a plain website link. Tokens, admin IDs and the SQLite database are preserved. `npm run bot:check` checks this same launch mode without contacting Telegram. Startup prints the selected public URL and `Telegram Mini App (web_app)`.

If you deploy elsewhere, set optional `MINI_APP_URL=https://your-real-https-site` in `src/bot/.env`. The active Mini App origin is added to the configured CORS allowlist. For the old SITE_URL/USE_WEB_APP behavior, use `npm run bot:website` from the repository root.

After `git pull origin Amin`, stop the previous bot with Ctrl+C, run `npm run bot`, and send `/start` to get a fresh button. Existing Telegram messages retain their original keyboards. Button icons vary by Telegram client; use the printed launch mode or the actual opening behavior rather than the arrow glyph to identify the mode. The HTTPS account/admin API still needs a public backend; this launch fix does not deploy or tunnel localhost.

## Local admin development

`npm run dev` now binds to `http://127.0.0.1:3000` with a strict port. This avoids
Windows' reserved 5139–5238 range (including Vite's previous 5173 default) and IPv6
localhost binding issues. If 3000 is occupied, stop the previous local server or
select an available port with `npm run dev -- --port 3002`. The API keeps port 3001.

Open `http://127.0.0.1:3000/#/admin` to work on the existing browser demo pages.
Preview is allowed only by the Vite development build on exact loopback hosts
(`localhost`, `127.0.0.1`, IPv6 loopback), outside Mini App mode, and only for
known demo routes. The banner identifies this local mode. It does not set
`isAdmin`, create a Telegram session, read real server records, or change backend
permissions. It is unavailable in `npm run build` / `npm run preview`, on public
hosts, and inside Telegram Mini App launches.

`/#/admin/telegram` requires a verified administrator in every environment. The
guest screen explains how to launch from Telegram; verified non-admin users see
a different access-denied message. API errors retain retry, with a loading state.
A local guest on this server page can return to the demo admin through the link.
There is no token/query-string switch that grants server access.

For server account testing through port 3000, add exact origins
`http://127.0.0.1:3000,http://localhost:3000` to your existing
`src/bot/.env` `ALLOWED_ORIGINS`, preserving the existing public origins, and
restart the API. Git does not modify your private `.env`. This is unnecessary
for the standalone local demo; production Telegram authentication still requires
the real HTTPS API and a Telegram ID listed in server `ADMIN_IDS`.

Check the local access policy with `node --test src/miniapp/adminAccess.test.js`.

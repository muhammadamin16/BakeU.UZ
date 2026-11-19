# BakeU production integration status (2026-11-19)

## Services and public URLs
- Website: https://bakeu-website-production.up.railway.app
- Telegram bot / account API: https://bakeuuz-production.up.railway.app
- Go/MongoDB backend: separate Railway service; configure its real URL separately, **not** as `VITE_ACCOUNT_API_URL`.

## Site authentication (current implementation)
Phone registration/login uses the Telegram bot's **Node + SQLite** API:
- `POST /api/auth/start-registration`
- `POST /api/auth/verify-registration`
- `POST /api/auth/start-login`
- `POST /api/auth/verify-login`
- `GET /health`

In Railway's **BakeU-WebSite** variables, set:
```dotenv
VITE_ACCOUNT_API_URL=https://bakeuuz-production.up.railway.app/api
```
Rebuild/redeploy the website, because Vite embeds this value at build time. Current frontend also uses the known bot API for production website domains if `VITE_ACCOUNT_API_URL` is absent or `/api` (no website reverse proxy is installed). For local development use `VITE_ACCOUNT_API_URL=/api` and Vite's proxy.

In the **BakeU-bot** variables configure `ALLOWED_ORIGINS` to include the **exact** website origin:
```dotenv
ALLOWED_ORIGINS=https://bakeu-website-production.up.railway.app,https://bakeu.uz,https://www.bakeu.uz
MINI_APP_URL=https://bakeu-website-production.up.railway.app
SITE_URL=https://bakeu-website-production.up.railway.app
TRUST_PROXY=false
```
Keep `BOT_TOKEN` and `ADMIN_IDS` in **Railway Variables**, never source control or frontend variables. **Rotate any previously shown BOT_TOKEN via BotFather**.

Railway public networking **Target Port** must match the real runtime `PORT` in deploy logs. For the reported deployment it was **8080**, not 3001. `GET https://bakeuuz-production.up.railway.app/health` must return `{"ok":true,"service":"bakeu-bot-api"}`.

## Persistent storage — do not lose user accounts
Node bot uses SQLite, not MongoDB. Before switching `DATABASE_PATH`, back up existing `data/bakeu.sqlite` and verify a persistent Railway volume. If a volume is mounted at `/data`, use `DATABASE_PATH=/data/bakeu.sqlite`; moving the path alone does not migrate historical accounts.

## Go backend integration remains separate
`BakeU-Backend` is Go/Gin with MongoDB. It currently provides email/password `/api/auth/signup` and `/api/auth/login`, not Telegram phone verification endpoints. The two accounts stores are **not synchronized**. No automatic migration or 100% end-to-end production verification should be claimed until a deliberate data migration and role/identity reconciliation is implemented and tested.

## Smoke-check command
From `BakeU.UZ`:
```bash
npm run deploy:check
```
It safely checks website HTML, bot health, CORS OPTIONS, and the presence of the phone auth route using intentionally invalid input. It does **not** create users. A complete end-to-end test must additionally register a fresh real Telegram account, share the matching phone contact with the bot, enter the code, log out, log in, and verify persistence after redeploy.

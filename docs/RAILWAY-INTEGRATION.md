# BakeU website, Go API and Telegram bot on Railway

The Railway website serves the frontend and proxies relative `/api` requests.
Go handles phone accounts, browser refresh sessions, orders, the catalog and
seller APIs. The bot handles Telegram and legacy Node endpoints. The gateway
forwards the original browser `Origin` so the selected upstream can enforce
its own policy. The gateway's successful OPTIONS response does not establish
that Go will accept the browser's request.

## Verify before promoting a build

1. In staging, deploy the compatible BakeU-Backend revision first. Confirm
   phone signup accepts a name, phone and role without email or password.
   Seller registration also sends the shop name. Existing phone proof and
   transaction behavior is documented in [the rollout guide](production/ROLLOUT.md).
2. On the website service, build with `VITE_GO_PHONE_ACCOUNTS=true`,
   `VITE_GO_API_URL=/api` and `VITE_ACCOUNT_API_URL=/api`. The runtime
   uses `WEB_ACCOUNTS_MODE=go` and explicit `WEB_GO_API_URL` and
   `WEB_BOT_API_URL` upstreams. Verify the built settings at
   `/bakeu-build.json`.
3. Verify each public website HTTPS origin against `WEB_ALLOWED_ORIGINS`
   on the website and `AUTH_BROWSER_ORIGINS` on Go. For the Railway URL,
   the exact entry is `https://bakeu-website-production.up.railway.app`.
   Use origins without paths or trailing slashes. Add custom domains only
   if they are active and intended to serve the application. Verify the
   bot's `ALLOWED_ORIGINS` for browser calls to bot routes. Apply any
   approved configuration corrections through the Railway service owner.
4. With staging URLs supplied, run the read-only check.

   ```bash
   BAKEU_WEBSITE_URL=https://your-staging-website.example \
   BAKEU_GO_URL=https://your-staging-go.example \
   BAKEU_BOT_URL=https://your-staging-bot.example \
   BAKEU_EXPECT_ACCOUNTS_MODE=go npm run deploy:check
   ```

   `gateway_go_browser_origin` and `go_browser_origin` should both
   return HTTP 401 for the anonymous request with the website's Origin.
   `go_origin_rejected` identifies a Go rejection.
   `website_origin_rejected` identifies a gateway rejection.
5. In staging, use test Telegram accounts for buyer and seller signup,
   login, session refresh after reload, order history and seller orders.
   After review and approval, promote Go before the website and rerun
   the read-only production check with `BAKEU_EXPECT_ACCOUNTS_MODE=go`.

Follow the [rollout guide](production/ROLLOUT.md) for persistent SQLite volume
and MongoDB configuration. This release requires no existing account or
database migration.

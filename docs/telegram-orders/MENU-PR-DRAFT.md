# Prepared Draft PR: buyer/seller menu and saved location

The branch is published. Automated Draft PR creation requests returned `Forbidden` from both the GitHub GraphQL and REST endpoints. The intended Draft PR body is saved below; this document is not proof that a PR was created.

[Open the GitHub comparison](https://github.com/muhammadamin16/BakeU.UZ/compare/Amin...codex/telegram-buyer-seller-menu?expand=1), use base `Amin`, head `codex/telegram-buyer-seller-menu`, and choose **Draft pull request**. Do not merge or deploy without the user's confirmation.

Title: **Telegram buyer/seller entries, numbered orders and saved location**

---

Both **📦 Мои заказы** and **🏬 Я продавец** are now visible in the Telegram main menu, replacing **Мой BakeU**. Private data still requires a confirmed active Go-account binding, the correct buyer/seller role and fresh order/shop ownership checks. Existing winter welcome, public navigation and admin permissions remain.

Buyer entry loads a numbered server-owned purchase list; seller entry preserves seller-role contact/account-proof intent and opens the real shop dashboard only after confirmation. Seller cabinet includes all shop orders and status filters. Lists support numbered inline buttons or typing a current-page number, pagination, refresh/back/site navigation and five-minute selection expiry. Only UI references are stored in the existing bot_state; snapshots, contacts, prices and histories remain in the shared Go/Mongo service. Every numeric selection rechecks actor UID/shop and fetches the owned order again.

Order details show unit/line prices, dates/time, status history, address and saved coordinates. **📍 Открыть карту** sends native Telegram Location only to the owning buyer/seller's validated private chat, after a fresh server read. Address-only, pickup, malformed GPS, other owners and injected chat IDs are covered. Status changes retain the CAS/idempotency and durable notification protocol; normalized seller roles retain action buttons in notifications. Missing APIs never produce fake order/link success.

## Backend dependencies — feature stays disabled by default

Go main `489d20e` was inspected read-only. It still lacks Telegram binding/bridge/outbox and the full nine-state order workflow. This branch changes no Go/Mongo/auth code or other working branches. The adapter and tests are ready; live synchronization and Mongo durability require the backend owner to implement the contract and mount the existing website account-proof/shared-auth components.

Additional contract requirements: role-constrained `{phone,requestedRole}` link challenges with fresh account proof, explicit `SELLER_NOT_FOUND` distinct from missing endpoints, `view=all` for confirmed buyer/seller order lists, durable authoritative order history/notifications and delivery coordinates/schedule (GPS stripped for pickup).

- [Current menu and location handoff](https://github.com/muhammadamin16/BakeU.UZ/blob/codex/telegram-buyer-seller-menu/docs/telegram-orders/MENU-UPDATE.md)
- [Exact Go API/security contract](https://github.com/muhammadamin16/BakeU.UZ/blob/codex/telegram-buyer-seller-menu/docs/telegram-orders/BACKEND-CONTRACT.md)
- [Validation record and limits](https://github.com/muhammadamin16/BakeU.UZ/blob/codex/telegram-buyer-seller-menu/docs/telegram-orders/VALIDATION.md)

## Validation

- 54 tests passed inside `node:24-bookworm-slim`, Node **v24.22.3**, network disabled, including admin/auth/support regression and the isolated bot-only build-boundary test with both feature settings.
- Actual Docker build with Root Directory/context **src/bot**, unchanged Dockerfile/railway.json/.dockerignore: passed. Runtime orders imports remain bot-local.
- Full entrypoint startup as the image's node user with Railway-style PORT=3000, orders enabled and test-only Telegram transport: bound 0.0.0.0:3000; `/health` HTTP 200; SIGTERM exit 0. No real Telegram/backend requests or production data.
- Website build, scoped ESLint and git diff --check: passed. Existing Vite chunk-size warning remains.

This is a **Draft PR** pending backend integration. No automatic merge, production deployment, Mongo mutation or independent order database was performed. Do not enable/deploy without the user's confirmation and the shared API being ready.

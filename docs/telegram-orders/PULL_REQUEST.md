# Prepared Draft PR

Git push to `codex/telegram-orders` succeeded. Automated Draft PR creation failed: `POST https://api.github.com/graphql: Forbidden`. No PR was created and no branch was merged. The GitHub CLI also reported its configured token invalid; do not paste a token into source or chat.

[Open the comparison on GitHub](https://github.com/muhammadamin16/BakeU.UZ/compare/Amin...codex/telegram-orders?expand=1), choose **Draft pull request**, base `Amin`, head `codex/telegram-orders`, and use the prepared text below.

Title: **Add Telegram seller and buyer orders integration (backend handoff)**

---

The existing bot has no shared Go-account binding or seller/buyer order workflow. This branch adds a role-aware bot integration, verified-link challenge flow, owned order views and guarded nine-state actions, plus a server-outbox notification consumer. It preserves the winter welcome, social/support navigation and existing admin permissions.

This is a draft integration against missing backend contracts. The inspected Go baseline (`b4a55d4`) lacks Telegram binding/bridge/outbox APIs and the complete workflow. The feature stays disabled by default; absent APIs never produce fake success. Website orders, inbox, delivery/map/GPS, progress and account-proof components are isolated and await mounting by the parallel shared-auth integration. No Go/Mongo/auth-store/checkout-route files are replaced. No production database, deployment, automatic merge or force push was performed.

## Ready in this branch

- Confirmed role menus: only My Shop for sellers, only My Orders for buyers; unlinked users receive My BakeU.
- Own-contact/E.164 checks followed by server-confirmed proof of an existing account, never account creation by phone match.
- Seller statistics/products/pagination and all nine status lists; buyer active/history; ownership checks, stale-click/CAS/idempotency request contracts and distinct pickup transitions.
- Typed Go bridge and browser API clients; server-only service credentials; durable lease/begin/ACK/failure protocol, receipt-only retry and explicit uncertain Telegram delivery handling.
- Namespaced React components using injected normal Go authentication, session isolation and no independent browser order history.

## Backend owner / integration dependencies

Implement the exact service and browser endpoints, atomic confirmed Telegram binding, nine-state Mongo history/CAS/idempotency, authoritative checkout delivery snapshots, durable inbox/outbox with dedup/lease recovery and V2 capability gating. Then mount the website components with the shared Go JWT transport. Multi-shop checkout with independent shop schedules needs the agreed per-shop server representation before that variant is mounted.

- [Handoff](https://github.com/muhammadamin16/BakeU.UZ/blob/codex/telegram-orders/docs/telegram-orders/README.md)
- [Exact API, binding, state machine and outbox contract](https://github.com/muhammadamin16/BakeU.UZ/blob/codex/telegram-orders/docs/telegram-orders/BACKEND-CONTRACT.md)
- [Website mounting and shared-auth requirements](https://github.com/muhammadamin16/BakeU.UZ/blob/codex/telegram-orders/docs/telegram-orders/WEBSITE-INTEGRATION.md)
- [Validation details and limits](https://github.com/muhammadamin16/BakeU.UZ/blob/codex/telegram-orders/docs/telegram-orders/VALIDATION.md)

## Validation

- `npm run bot:test`: 46 passed, including auth/admin/support/Mini App regression tests and 13 new order integration groups.
- Scoped ESLint and `git diff --check`: passed.
- `npm run build`: passed (existing application chunk-size warning).
- Separate Vite build of all five isolated React components: passed.
- Headless Chromium with a test-only transport: seller status refresh, server inbox, session isolation, explicit map/GPS, delayed GPS/edit/pickup and server-confirmed link behavior passed.

No live Telegram sends or real Go/Mongo persistence/end-to-end tests were run. Those remain staging acceptance checks after the missing backend API is ready. Do not enable the feature or merge this draft before the two integrations are reviewed together.

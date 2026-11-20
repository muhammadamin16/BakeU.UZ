# Buyer/seller menu and saved location

Current implementation/activation: [ACTIVATION.md](./ACTIVATION.md). Earlier missing-endpoint notes below describe the pre-integration baseline.

This revision supersedes the earlier role-only main menu. Branch: `codex/telegram-buyer-seller-menu`, based on `Amin/f774e6d`. Go was inspected read-only at `main/489d20e`; its Telegram bridge/binding/outbox and complete order workflow are still absent. No Go, shared auth or Mongo code is changed here.

The branch is published. GitHub API rejected automated Draft PR creation; the [prepared Draft PR description and comparison link](./MENU-PR-DRAFT.md) are saved for review. This is not approval to merge or deploy.

## Implemented bot behavior

- Everyone, including unlinked users and configured admins, sees **📦 Мои заказы** and **🏬 Я продавец**. The old My BakeU button is gone. The winter welcome, site/social/support/email/about and admin functions remain.
- The buyer entry checks a confirmed Go identity and buyer role, then loads a numbered server-owned purchase list. Seller entry shows a seller contact/account-proof prompt when unlinked and opens the real shop dashboard when already confirmed. Neither button creates an account or grants a role.
- Own contact is checked in a private chat, normalized to E.164 and submitted with the intended `requestedRole`. An existing account must still be proved on the authenticated website. The callback preserves buyer/seller intent until confirmation; legacy account callbacks continue to work.
- Seller cabinet includes **Мои заказы** for all states plus state filters, products/statistics/settings/site links. Buyer lists support all/active/history. Each list has numbered inline buttons, totals/statuses, refresh, back and paging. Sellers also see the saved buyer name.
- Typing a number selects only one of the current page's five IDs, after a fresh identity/role/UID/shop check. A five-minute expiry, page replacement, support navigation or account change prevents stale selection. The selected order is loaded and ownership checked again. Recreating the handler preserves only navigation metadata; no local order history is created.
- Order details include ID/number, item unit prices and line totals, totals, dates/time, address, comment, current status/history and refresh/back/site buttons. Seller-only legal status actions retain the existing CAS/idempotency protocol and durable notification consumer.

## Location

For delivery with valid saved latitude/longitude, both owning participants see **📍 Открыть карту**. Pressing it reloads the order, checks the current actor and sends native Telegram Location to that actor's private chat. Coordinates come from the Go order snapshot; fields such as `location.chat_id` never select a recipient. There is no third-party map URL, automatic GPS collection or paid SMS.

Without GPS the bot shows the saved address. For pickup it does not display/send GPS, including stale coordinates from an old snapshot. Invalid coordinates and non-owners are denied. The existing isolated website delivery component already supports manual address, optional map/GPS, date/time and pickup; mounting it into the shared Go-auth checkout remains the parallel integration's responsibility.

## Exact additional backend requirements

Use the full [backend contract](./BACKEND-CONTRACT.md), with these additions:

1. `POST /api/integrations/telegram/link/challenges` accepts `{phone,requestedRole:"CLIENT" or "SELLER"}`. The trusted bot has checked private own-contact ownership. Never bind on phone match alone; persist the role intent and enforce it alongside existing authenticated UID, account/phone verification and fresh account proof during `/api/me/telegram/link/confirm`. A buyer cannot become a seller through this field.
2. Missing seller lookup may return HTTP 404 with the exact allowlisted code `SELLER_NOT_FOUND` after the private own-contact verification. Rate-limit the actor/phone lookup, return no other seller/account details and never enumerate an arbitrary phone supplied publicly. Missing endpoints/plain 404 and outages must not use this code.
3. `GET /api/integrations/telegram/orders?audience=seller|buyer&view=all&page=0&limit=5` returns `{orders,nextPage}` in deterministic newest-first order, filtered by confirmed UID/shop. Existing `active`, `history` and exact status views remain supported. A page holds at most five orders. All details/mutations/location accesses require fresh server ownership checks.
4. The order DTO includes authoritative delivery address, optional valid paired coordinates, fulfillment and schedule. Go must strip buyer GPS/address for pickup. Shared Mongo history/inbox/outbox, nine-state CAS/idempotency and website auth/route mounting remain prerequisites from the original contract.

The feature remains disabled by default. These are real adapter calls with contract tests, not implemented Go endpoints; enabling the flag before the API/auth route is ready shows an unavailable/authentication screen, not successful orders.

## Storage and deployment boundary

The existing `bot_state` stores only `kind`, screen/intent, expiry, current page/filter, confirmed UID/shop ID and up to five order-ID references. It never stores buyer phones, addresses, coordinates, items, prices or status history. Actual order records, account binding and notifications belong to the shared Go/Mongo backend. No new database/schema was introduced.

Railway Root Directory stays **`src/bot`** with its existing Dockerfile/config. Every runtime order import stays bot-local (`./domain.js`, `./api.js`, etc.); the website only re-exports the pure bot-local domain. The bot-only deployment regression tests both feature-flag settings. Production deployment/merge require the user's confirmation; this branch does neither.

## Checks

The committed suite covers both menu entries, admin/winter regression, role aliases/denials, own/private contact and role intent, missing seller versus missing endpoint, buyer/seller ownership, numbered page selection, account switch/expiry/support isolation, handler recreation, refresh/history, allowed/stale/duplicate mutations, notifications, recipient/GPS injection and pickup/address-only behavior. HTTP tests use local/test transports. Real Mongo persistence, website/bot synchronization and live Telegram delivery still require the Go integration and staging checks; a test fixture cannot establish those guarantees.

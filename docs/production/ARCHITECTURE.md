# Production integration audit — 21 November 2026

Audit inputs: website `Amin/65bf585`, backend `main/b0cda36`; both worktrees
were clean before creating `codex/production-integration-audit-20261121`.
Merged Git histories were inspected, including website PRs 12–21 and backend
PRs 9, 10 and 12. Earlier Telegram/verified-account/Mini App work is already
merged; revision-safe Mongo carts and the public Go catalog are also present.

## Current data and identity boundaries

| Area | Implementation at the audited heads | Remaining issue |
| --- | --- | --- |
| Verified accounts | Go `users`, unique verified E.164 identity, bindings, OTP challenges, revocable refresh sessions | Website phone flow is opt-in; flags/build/runtime must be coordinated |
| Legacy registration | Node `users`/`sessions` in SQLite; optional scrypt password or own-contact OTP | Go-disabled frontend can create SQLite users; completed phone challenge evidence is not retained as a durable per-user binding |
| Mini App | Signed initData checked by Node; one-use ticket creates the same Go identity/session | Legacy Node capability remains for its existing admin-only API |
| Shops | Mongo `markets`, one seller owner, draft/pending/approved/rejected; GridFS logos | Customers cannot open a Go shop; self-service needs deliberate verified promotion without losing buying/history |
| Catalog/map | Public Go shops/products, variants/media, owner-pinned editor and real map points | Favorites still consume browser/demo catalog; social/hours/cover are not fully connected |
| Cart/orders | Mongo revision-safe carts, server-priced variant snapshots, multi-shop checkout, immutable history and idempotency | Preserve recent cart integration; no browser-imported order history can become authoritative |
| Notifications | Mongo inbox/outbox with leases/receipts/uncertain-send semantics; separate legacy SQLite admin outbox | Generic outer catch loses the failing subsystem/status/stage; claim 401 becomes 503 in the bridge adapter |
| Deployment | Separate website, bot, Go and Mongo Railway services | No root website production API proxy/start server; relative API paths can reach a static server, while cross-site Go cookies are unreliable across independent Railway domains |

## Confirmed source-level causes and limits

1. `VITE_GO_PHONE_ACCOUNTS=false` selects Node phone registration. Its
   `verifyRegistration` inserts SQLite `users`; it never inserts Go `users`.
   This explains the reported combination of successful legacy registration and
   empty Mongo users, but actual production row counts are not available here.
2. Legacy users store Node scrypt hashes (or empty password hashes for OTP-only
   accounts). Go verifies bcrypt. Copying those hashes to Go `passwordHash`
   would not create a working or safe login. A completed legacy pending challenge
   is deleted; a profile phone/Telegram chat record does not prove account ownership.
3. `/api/auth/login` and `/api/auth/logout` exist in both APIs. A website gateway
   must route explicit Go-session requests separately during legacy transition;
   it must never forward privileged `/api/integrations/telegram` to browsers.
4. Go uses `Secure`, `HttpOnly`, `SameSite=Strict` refresh cookies with exact HTTPS
   Origin checks. Use a same-origin `/api` proxy on the website; CORS alone does
   not fix cross-site cookie policy on distinct `*.up.railway.app` services.
5. `Outbox worker failed; will retry.` is a catch shared by legacy and Mongo
   workers. The source cannot identify the production failure. Safe categorized
   diagnostics and a read-only bridge check are required before naming a cause.

## Production access and phase status

Read-only HTTPS requests to all three supplied Railway domains were attempted.
The environment proxy rejected CONNECT with HTTP 403 before TLS reached those
services (`curl` destination status 000). This is an environment access failure,
not evidence of a Railway health failure. Railway CLI/credentials, production
SQLite volume, Mongo snapshots and deployment logs were not available.

Phase 1: repository audit and schema inspection complete; live inventory and
live notification root cause remain unverified. Existing Go tests passed using
an isolated MongoDB 8 replica set. `npm ci` succeeded using a workspace-local
cache after the default cache directory was not writable. No production data,
variables, deployments, volumes or branches were changed.

Next phases prepare a read-only full inventory/claim plan, safe proxy and
notification diagnostics, verified self-service shops and real buyer data;
validate with disposable databases; publish feature branches and review plans.
Live deployment/migration remains gated on explicit approval and verified backups.

## Prepared implementation (phases 2–4)

The feature branch now includes the same-origin production gateway and build-mode
checks; protected Go readiness/bridge diagnostics and independent outbox workers;
SQLite write cutover guard; snapshot inventory, offline claim planner and
staging-only idempotent quarantine; optional verified self-service shop promotion,
UID-based moderation and preservation of purchases for seller buyers; Mongo-backed
favorites with separate guest state and pinned account mutations. Existing cart
revisions, variants, refresh sessions, signed Mini App proof and public Go catalog
were reused. New shop controls retain the map component and RU/UZ dictionaries.

Read [ROLLOUT.md](ROLLOUT.md) for exact variables and coordinated activation,
[VALIDATION.md](VALIDATION.md) for checks and their limits, and the backend
`docs/production/MIGRATION.md` for field mapping and synthetic dry-run findings.
Production access, actual snapshots, approved claim resolution, deployment and
real delivery remain explicit human gates; no live success is claimed.

# Validation record — 21 November 2026

All data below are local/disposable. Production Railway, real Telegram delivery,
production account counts, backups and deployed environment values remain
unverified. No production write/deploy/merge was performed.

## Automated checks

- npm ci: passed with workspace npm cache (default home cache was not writable).
- npm run build: passed for Go-enabled `/api` production configuration. Existing
  >500kB main-bundle warning remains; no dependency upgrade was made.
- npm run lint: passed, zero errors; two existing exhaustive-deps warnings in
  Profile.jsx and seller/SellerProfile.jsx remain outside this change.
- npm run test:integration: 87 passed; gateway, Go sessions/catalog, Mini App account
  isolation, revision-safe variant carts/checkout, favorites, localization,
  existing admin/device/development-port compatibility included.
- npm --prefix src/bot test: 67 passed. Includes local-root deployment/import,
  phone-proof, menu/ownership, leases/acks/failures/retry, HTTP, cutover and safe
  diagnostic regressions.
- npm --prefix src/bot run miniapp:check: passed using an explicit fake bot token,
  fake admin ID and disposable SQLite path. Telegram was not contacted.
- npm run miniapp:test: passed welcome/admin guest restrictions and account-switch
  isolation (same command script checked directly).
- Backend Go tests with MongoDB8 replica set, race detector and go vet: passed.
  Additional standalone Mongo test proves liveness/ping200 is compatible with
  readiness503 when transactions are unsupported. This is a synthetic topology,
  not a diagnosis of Railway's actual Mongo configuration.
- Backend SQLite exporter test: passed snapshot byte preservation, no password
  hashes/salts/proof invention, private output mode and overwrite refusal.

## Real local integration

A mobile-size Chromium browser used a real HTTPS Node production gateway and
compiled dist, real bot HTTP/handlers and Go API with an isolated persistent
MongoDB8 replica-set database. Only Telegram delivery/signature source was
simulated with a fake bot key. External map tiles were blocked; GPS permission
used a deterministic test location.

Verified own-contact phone registration and Mongo UID creation; reload restores
refresh cookie; customer opens own shop with text address/GPS, same UID and
previous order history; real product and cart quantities; server favorites survive
reload; a promoted seller can buy from another shop. A real committed order was
seen by seller and buyer, seller status transition updated Mongo history and the
actual bridge worker produced seller/buyer sends through the simulated transport.
No customer record was inserted into the test bot SQLite store.

Separate signed-Mini-App browser flow verified the same Go UID, removal of stale
other-account refresh cookies for an unlinked actor, reload, revocation staying
signed out and explicit reauthentication. This does not prove Telegram WebView
behavior on a real user's phone; that remains in the live checklist.

## Containers and deployment boundary

The bot Dockerfile was built using exactly `/src/bot` as context and checked as
nonroot Node24 with Railway-style PORT/host settings, fake token and SQLite path.
`orders/domain.js`, `orders/api.js` and bridge diagnostics are present in image;
no import depends on a parent directory.

The website Docker build initially hit the environment HTTPS interception CA
error SELF_SIGNED_CERT_IN_CHAIN during npm ci. TLS verification was not disabled.
A temporary copy of the same Dockerfile mounted the existing host trust bundle as
an ephemeral BuildKit secret for npm; that build passed. No proxy CA or credential
was added to source or final image. The resulting nonroot Node24 runtime passed
PORT/static HTML/catalog/Go POST JSON validation/bridge404 checks. The unmodified
Dockerfile still needs a normal Railway build, or equivalent trusted build-network
configuration; this environment-specific trust step is not a production fix.

## Migration rehearsal

The backend MIGRATION.md records an executed synthetic SQLite inventory → Mongo
inventory → offline plan → staging twice. Four source users: zero automatic
merges/accounts created, one mapped skip, one conflict, one verification hold,
one manual review; orphan references identified. Only a quarantined pending claim
was staged once; rerun preserved it. Actual production inventory and secure claim
execution are not represented by these fixture counts.

## Production access limitation

Requests to all supplied Railway domains were rejected by the outbound proxy
before TLS (CONNECT403, destination000), so no production HTTP result is inferred.
GitHub API/PR creation may also be restricted; branch push and PR creation are
reported separately in the final response. A health200 alone cannot close any
unverified live identity, persistence, checkout or notification acceptance item.

An actual Go API process restart was also performed against the same disposable
Mongo database. Re-login returned the original UID, and the accepted order with
history, cart quantity and favorites were all preserved.

Both feature branches were pushed and remote SHAs verified. Draft PR creation was
attempted for website→Amin and backend→main; GitHub API returned Forbidden before
creating either PR. These are **comparison links, not created PRs**:

- https://github.com/muhammadamin16/BakeU.UZ/compare/Amin...codex/production-integration-audit-20261121
- https://github.com/muhammadamin16/BakeU-Backend/compare/main...codex/production-integration-audit-20261121

For tests performed after both previous PRs were merged, use
[CONTINUATION-20261122.md](CONTINUATION-20261122.md). That record supersedes the
old branch/PR publication status above; it does not turn historical local tests
into live production verification.

# Verified Go accounts — coordinated rollout

This branch includes the catalog-to-checkout changes from Draft PR #11 on top
of `Amin`, preserving their original author. It adds an opt-in phone registration
flow which reuses the existing Go session rather than creating a SQLite account.

Enable after reviewing and deploying the corresponding backend branch:

| Service | Settings |
| --- | --- |
| Go | `AUTH_PHONE_ACCOUNTS=true`, `TELEGRAM_BOT_USERNAME=BakeUuzBot`, `AUTH_REFRESH_SESSIONS=true`, exact `AUTH_BROWSER_ORIGINS`, existing protected `TELEGRAM_BRIDGE_TOKEN` |
| Bot | `GO_ACCOUNTS_ENABLED=true`, actual HTTPS `GO_BACKEND_URL`, matching protected `TELEGRAM_BRIDGE_TOKEN` |
| Website | `VITE_GO_PHONE_ACCOUNTS=true`, same-site HTTPS `VITE_GO_API_URL` ending in `/api` |

No service secret belongs in a `VITE_` variable. The existing
`TELEGRAM_ORDERS_ENABLED` separately controls the order bridge/worker.
Keep flags off until both services support the protocol. Never fall back to
SQLite registration on a Go failure: show the actual error and retry instead.
If the phone flag is enabled without a Go API URL, registration stays unavailable
rather than silently creating a legacy SQLite user.

The main map reads the paginated public Go markets and products when the Go API
is configured. Shops without valid coordinates are omitted from the map. Its
existing device-location/distance controls work with those server points, and
details open the real storefront or preselected server checkout. A failed server
request shows a retry action and never substitutes demo shops.

The ordinary `/login` and `/register` routes use Telegram contact proof plus a
six-digit code, then establish the shared Go secure-cookie session. `/profile`
opens the real server cabinet. The user can still enter an existing Go account
by email on `/account/orders` to confirm its original ownership. Editing a
contact number does not change the separately displayed verified identity.

Seller registration atomically creates a private draft storefront. The cabinet
can submit its description, city, contact information, logo and optional GPS
through the existing market approval API. Products stay unavailable until the
market is approved. Storefront/product writes in this cabinet use the pinned
account transport so a changed session cannot apply an old form to a new user.

Local verification uses real Go, a disposable MongoDB replica set, HTTPS Chromium,
and actual bot handlers with Telegram delivery simulated. It covers buyer/seller
registration, matching own contacts, concurrent ownership, session reload,
logout/relogin to the same UID, and the seller application/logo/GPS path.

## Remaining work before a full migration

Variant checkout now preserves stable IDs, displays the selected server price,
and shows its immutable name/price snapshot in the order history and Telegram
cards. The client checks `variantSnapshots` before submitting a variant, so an
older Go API cannot silently bill the base product. The seller editor retains
variant IDs across edits. A real HTTPS purchase/replay/status/reload passed on
the disposable MongoDB, including a product photo upload and catalog preselection.

No production activation or legacy data migration happened. Restore/audit real
SQLite and Mongo backups before any explicit user migration. Node Mini App auth,
native secure token storage, the legacy
browser cart/favorites/subscriptions, server chat and full Go admin RBAC still
need their own implementation and verification. Existing GridFS photos remain
in place; moving them to S3/R2 requires a separately configured storage service.

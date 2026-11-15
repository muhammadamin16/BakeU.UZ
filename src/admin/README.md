# BakeU Admin (demo)

Open `http://localhost:5173/#/admin` after `npm install` and `npm run dev`.

The admin is a browser-local demo, not a secured production admin. All admin records are independent demo data persisted by Zustand under `bakeu-admin-demo-v1`. They do not modify customer/seller account stores. There is no server authentication or payment processing. Server-side authentication and role checks are required before using real records.

Pages: dashboard, customers, sellers, shops, account/shop details, applications, products, orders, subscriptions, notifications, history, settings. Collection pages support search, status filter, create, edit, and confirmed delete. Approving a pending application creates one shop; repeated decisions are ignored. Counts use actual demo records rather than static screenshot totals. Date period filters apply to dated customers, applications, and orders; inventory and current subscription totals show current state.

Settings and read/unread notification state persist locally. Use your browser storage tools to clear `bakeu-admin-demo-v1` to restore demo data. Header search filters the current collection and preserves account/shop scope and status filters. From a record profile it opens the corresponding collection.

## Account profiles

The sidebar has separate Customers and Sellers lists. Names and profile links open
`/admin/customers/:id` and `/admin/sellers/:id`. Profiles show contact details,
login/email metadata, status, registration date, notes, and linked orders. Seller
profiles also show their shops, products, and subscriptions. Profile fields can
be edited; these edits update admin demo records only.

Existing `bakeu-admin-demo-v1` browser snapshots are upgraded in place on hydration.
Seller accounts are derived from existing shop owners without discarding saved
records. Relationships use stable customer, seller, and shop IDs; ambiguous
legacy names are left unlinked. Sellers with shops cannot be deleted until those
shops are removed or assigned to another seller.

Authentication credentials remain in the storefront authentication system and
are never read or copied into these profiles. The password reset control is
explicitly unavailable until a protected authentication/reset service is
connected. Saving login metadata or changing a demo card's status does not change
storefront credentials or sign-in permissions.

## Products, orders, subscriptions and history

Account metrics open collections scoped by stable IDs. Products, orders and
subscriptions each have detail pages with related account/store links and history.

Products show photos in lists and detail pages. An administrator can provide a
local or HTTPS image URL, or upload PNG/JPEG/WebP (up to 8 MB). Uploads are resized
to 1200 px and compressed before browser storage. Broken/missing images have an
explicit placeholder. Existing known seed products receive their matching photos;
custom records and explicitly removed photos are preserved.

New orders require an active customer, an open store with an active seller and,
for a Pro store, a current subscription. Order items must belong to that store
and be published. Prices, names and images are snapshotted from the catalog;
totals are calculated from quantities. Historical items survive catalog changes
and product deletion. Legacy orders without items explicitly say that composition
is missing. Statuses progress from New to In progress to Delivered, with
cancellation available before delivery. Completed/cancelled orders retain their
financial data; notes remain editable.

Freezing an account requires a reason and blocks new demo operations. Seller
freezes also pause active subscriptions. Thawing resumes only subscriptions paused
by that freeze; an administrator's manual pause stays in place. Existing orders
can still be completed. These rules apply to the admin demo data, not storefront
sign-in or payment processing.

Subscription pauses preserve the exact remaining duration. Resuming shifts the
expiry by the paused time without changing the recorded payment. Expired plans
require an explicit future renewal date. An active Pro plan is required to
publish a new product or create an order for a Pro store. These controls do not
stop or start bank debits; no payment provider is connected.

History records administrative changes, status decisions and reasons, with
before/after values and links to related records. It starts with actions performed
after this feature is installed; past events are not fabricated. Credential
material and raw photo data are excluded. Browser history is not a server audit
trail and can be modified by someone with access to browser storage.

Saved data is migrated in place without clearing existing records. Storage quota
failures leave the previous state intact and show an error. Other tabs rehydrate
changes through browser storage events. Deleting linked customers, sellers or
stores is prevented until relationships are resolved.

Run relationship, lifecycle and migration checks with:

```sh
node --test src/admin/utils/*.test.js
npx eslint src/admin
npm run build
```

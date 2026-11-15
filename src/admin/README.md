# BakeU Admin (demo)

Open `http://localhost:5173/#/admin` after `npm install` and `npm run dev`.

The admin is a browser-local demo, not a secured production admin. All admin records are independent demo data persisted by Zustand under `bakeu-admin-demo-v1`. They do not modify customer/seller account stores. There is no server authentication or payment processing. Server-side authentication and role checks are required before using real records.

Pages: dashboard, customers, combined shops/sellers, shop details, applications, products, orders, subscriptions, notifications, settings. Collection pages support search, status filter, create, edit, and confirmed delete. Approving a pending application creates one shop; repeated decisions are ignored. Counts use actual demo records rather than static screenshot totals. Date period filters apply to dated customers, applications, and orders; inventory and current subscription totals show current state.

Settings and read/unread notification state persist locally. Use your browser storage tools to clear `bakeu-admin-demo-v1` to restore demo data. The header search filters the current page (except settings and shop details).

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

Run account migration and relationship checks with:

```sh
node --test src/admin/utils/accounts.test.js
```

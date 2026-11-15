# BakeU Admin (demo)

Open `http://localhost:5173/#/admin` after `npm install` and `npm run dev`.

The admin is a browser-local demo, not a secured production admin. All admin records are independent demo data persisted by Zustand under `bakeu-admin-demo-v1`. They do not modify customer/seller account stores. There is no server authentication or payment processing. Server-side authentication and role checks are required before using real records.

Pages: dashboard, customers, combined shops/sellers, shop details, applications, products, orders, subscriptions, notifications, settings. Collection pages support search, status filter, create, edit, and confirmed delete. Approving a pending application creates one shop; repeated decisions are ignored. Counts use actual demo records rather than static screenshot totals. Date period filters apply to dated customers, applications, and orders; inventory and current subscription totals show current state.

Settings and read/unread notification state persist locally. Use your browser storage tools to clear `bakeu-admin-demo-v1` to restore demo data. The header search filters the current page (except settings and shop details).

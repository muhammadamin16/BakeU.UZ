# BakeU production audit

Reviewed website Amin at ac7044e and backend main at 98f1239. The Flutter remote advertises no refs. Android and iOS sources live in the website's apps/mobile directory and use Capacitor.

| Source | Data and dependencies |
| --- | --- |
| React / Vite | VITE_ACCOUNT_API_URL selects the Node account API. localAccount.js has a browser-only fallback. session.js and bot/client/accountApi.js use sessionStorage for the profile and bearer token. Profile.jsx refreshes the profile, with a local fallback. |
| Zustand | shopStore.js stores shop customizations and images. sellerData.js combines seeded catalog entries and local seller records. SellerShop and SellerProfile consume these records. workspaceStore.js holds follows, conversations, messages, order history and reviews locally. cartStore.js and favoriteStore.js persist browser data. |
| Node / Telegram | SQLite holds users, seller applications, bearer sessions, pending challenges, Mini App sessions, support tickets and notification outbox. The Mini App has its own Telegram auth flow. The repository includes an HTTP health check for the bot and an optional SQLite volume path. |
| Go / Gin | MongoDB holds users, markets, products, carts, orders and reviews, with images in GridFS. Email/password auth issues JWTs. Email uniqueness does not enforce phone uniqueness. The profile endpoint updates the phone as a mutable field. The seller API still supports an approval application. |
| Admin | Website admin screens and Mini App server administration need separate verification. Telegram admin access uses configured Telegram IDs. The reviewed Go router has no general administrator API. |

## Routes and deployment

Go routes include GET /healthz, GET /readyz, POST /api/auth/signup, POST /api/auth/login, GET /api/me, POST /api/profile, /api/products, /api/cart, /api/orders, /api/market, /api/images and /api/seller/dashboard. Node has GET /health, password and Telegram challenge routes under /api/auth, account profile/shop routes and Mini App administration. Both Railway URLs supplied by the repository or request returned HTTP 200 for website HTML and Node health. The Go deployment URL, Railway service configuration, SQLite volume, MongoDB contents and backup policy require service access.

## Data transition

1. Inventory a restored MongoDB snapshot and a consistent SQLite backup. Keep the existing MongoDB markets collection and IDs unless a later verified migration requires moving it. Preserve the legacy SQLite user ID as an identity mapping where it differs from MongoDB.
2. Identify normalized phone collisions independently within each source and across both sources. Resolve ambiguous accounts through verified control and review. Do not infer phone verification from an existing phone string.
3. Stage a unique index on the canonical phone field after collision review. Restrict writes to that field to verified identity operations. Freeze legacy registration at cutover to prevent either writer from creating new collisions.
4. Import browser-only records after sign-in, scoped to the verified owner and validated server-side. Prices, order history, roles and account identifiers from browser storage are untrusted. Keep original backups until reconciliation and rollback testing are complete.
5. Move new images to persistent S3-compatible storage and verify existing media before switching reads. Route web, mobile and Telegram operations through Go. Keep Telegram delivery and the existing client UI.

Existing variables to verify in Railway are MONGODB_URI, MONGODB_DB, JWT_SECRET, APP_BASE_URL, MARKET_REVIEW_SECRET, RESEND_API_KEY, EMAIL_FROM and ADMIN_EMAILS for Go, and BOT_TOKEN, ADMIN_IDS, ALLOWED_ORIGINS, API_HOST, PORT, DATABASE_PATH and SESSION_HOURS for the bot. VITE_ACCOUNT_API_URL is a build-time website setting. Replace the exposed Telegram token through BotFather and update Railway's secret value before relying on it.

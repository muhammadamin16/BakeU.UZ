# Marketplace contract map

Base revisions verified against GitHub:

- Website Amin: `de191cba9695783956943c5fb85cea78adf3456b`.
- Website Joka: `f3cc752c5d01542bbbcae3feff642f4efec23f2e`. UI reference, separate branch.
- Backend main: `37c94025ca5a294db515da1c9892149462990573` (empty tree). Previous Go API reference: `1645bc1`.
- Marketplace P0 references: website `df9848b`, backend `76e7c8c`.

| Flow | Actor | API / DTO | Persistence | Verification |
| --- | --- | --- | --- | --- |
| Home, seller directory, map | Public | GET /markets and /products, {items,next}, product array compatibility | markets, products | goCatalog.test.js |
| Product detail and carousel | Public | GET /products/:id, imageURLs and variants; GET /images/:id | products, GridFS | Build and catalog tests |
| Seller storefront | Seller | Market profile, coordinates, fulfillment | markets | P0 market contract history |
| Seller product editor | Seller | Product fields, stable variants, ordered imageURLs | products, GridFS | P0 product contract history |
| Register, login, profile | Buyer or seller | Phone challenge, proof, UID, refresh session | users, bindings, challenges, sessions | goSession.test.js and P0 phone contract history |
| Telegram link and launch | Telegram actor | Broker proof and signed initData | bindings, sessions | bot tests |
| Cart and checkout | Guest or account | productId, variantId, qty, cart revision | carts, orders | guestCart.test.js, serverCart.test.js |
| Orders and order detail | Buyer or seller | {placed,incoming}, immutable snapshots and status changes | orders | P0 checkout contract history |
| Favorites, follows, messages, reviews | Account | Existing local flows require server integration for shared state | Pending server contracts | Pending |
| Demo admin, ServerWorkspace, Mini App admin | Admin | Legacy /admin/records/:kind, /admin/sales and Mini App control plane | Domain collections, audit | Pending Node integration |
| AI assistant | Visitor or account | Existing client AI workflow | Client history | Pending |
| Website gateway and mobile | Client | Same /api contracts, cookies through gateway | No separate database | Gateway integration tests |

Go history uses string application IDs, HS256 access JWTs with subject and optional sid, and ObjectIds for GridFS. Production compatibility requires refresh-family verification and a separate dry-run index/migration review before enabling writes. Existing mutable email and phone fields are not proof of ownership.

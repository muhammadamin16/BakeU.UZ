# Contract for the shared Go/MongoDB owner

These are required APIs, not endpoints implemented in this website branch. Existing business collections, authenticated user IDs and product/shop ownership remain authoritative. Add fields/collections to the **same** Mongo database and existing application service; do not introduce a separate Telegram account/order store.

The executable clients are `src/bot/orders/api.js` and `src/telegramOrders/client.js`.
Typed payloads: `src/bot/orders/contracts.d.ts`, `src/bot/orders/api.d.ts`, `src/telegramOrders/client.d.ts`.
All replies are JSON. Use 400 for invalid input, 401 for missing service/user credentials, 403 for forbidden/disabled accounts, 404 for unavailable resources, 409 for conflicting binding/CAS/idempotency and 429 for rate limits. Never return password/hash/JWT/service secrets in order, identity or notification DTOs.

## Browser APIs: existing normal Go authentication

| Method and `/api` path           | Request                                                                                                 | Required result                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| GET `/me`                        | Existing Go access token                                                                                | Existing `{uid,role,name,phone,...}`; roles `seller` / `customer`                                                             |
| GET `/orders`                    | Same auth                                                                                               | Existing `{placed: Order[], incoming: Order[]}`, filtered by authenticated UID, with the fields below                         |
| GET `/orders/capabilities`       | Same auth                                                                                               | `{workflowVersion:2,idempotency:true,history:true,deliveryScheduling:true}` **only after all four guarantees actually exist** |
| POST `/orders`                   | `Idempotency-Key`; `{items:[{productId,qty}],fulfillment,deliveryAddress,location,scheduledAt,comment}` | `{orders:Order[]}` after the Mongo transaction commits                                                                        |
| PATCH `/orders/:id/status`       | `Idempotency-Key`; `{status,expectedStatus,expectedVersion}`                                            | Updated `Order` after CAS and transaction commit; seller ownership checked server-side                                        |
| POST `/me/telegram/link/confirm` | `{challengeId,password}`                                                                                | `{linked:true,confirmed:true}` only after fresh account proof and atomic binding                                              |
| GET `/me/notifications`          | Same auth                                                                                               | `{items:[{id,userId,orderId,title,createdAt,telegramState}]}`; only the authenticated user's durable inbox                    |

Browser writes deliberately check capabilities before POST/PATCH. The currently inspected five-state backend must not advertise V2: it otherwise silently ignores delivery/time/CAS fields it cannot save. Read-only older orders can still be displayed. `out_for_delivery` has a display-only alias in the progress component; do not silently map the nine-state write protocol onto the old five states.

Checkout rules: resolve products/shops/sellers/prices and buyer contact from Mongo, validate availability/account status/quantity and allowed pickup, group by shop, snapshot item title/unit price and buyer contact, sum on the server, store exact delivery details, start every order at `pending`. Do not accept price, seller ID, buyer ID or status from the browser. Validate dates in the future, at most 366 days out; `scheduledAt` is UTC ISO derived from Asia/Tashkent date/time. Coordinates must be finite latitude [-90,90], longitude [-180,180], both present or both absent. Pickup must not persist the buyer's private delivery address/GPS. Address max 500 and comment max 1000 characters. Persist a `pending` history event, notification inbox records and outbox intents in the same transaction as the order. Key idempotency by authenticated user + operation + request key, hash the normalized body, return the committed result on replay and reject a different body with 409. Retain the existing cart transaction semantics.

## Server-only Telegram bridge

Prefix: `/api/integrations/telegram`.

Authenticate every route with `Authorization: Bearer TELEGRAM_BRIDGE_TOKEN`, separate from normal JWTs and the bot token. Do not expose this token to the browser. Every actor route also has `X-Telegram-User-Id`, taken by the trusted bot from a validated private Telegram update. This header alone is never authentication. Go loads the active confirmed Mongo binding and derives UID/role/shop on **every** call, checks account freeze/deletion and shop ownership; never trust supplied role/UID/shop IDs. The worker routes require service auth but no actor header. Rate-limit link/proof attempts; redact credentials and challenge/password values in logs.

| Method and bridge-relative path                           | Request                                                                            | Response                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET `/me`                                                 | Actor                                                                              | `{linked:false}` or `Identity`                                                                   |
| POST `/link/challenges`                                   | Actor; `{phone:"+998..."}`                                                         | `{id,expiresAt,confirmationUrl}`                                                                 |
| GET `/shop`                                               | SELLER actor                                                                       | `{id,ownerId,name,phone,address,productCount,revenue,counts}`; `counts` has all nine status keys |
| GET `/shop/products`                                      | SELLER actor                                                                       | `{ownerId,shopId,items:[{id,title,price}]}`; only their shop's products                          |
| GET `/orders?audience=seller&view=pending&page=0&limit=5` | SELLER actor; `view` any of the nine exact states                                  | `{orders:Order[],nextPage:number                                                                 | null}`; deterministic newest-first paging, max 5 |
| GET `/orders?audience=buyer&view=active&page=0&limit=5`   | CLIENT actor; `active` or `history`                                                | Same; history = terminal states, active = other states; filter by customer UID, never phone      |
| GET `/orders/:id`                                         | Confirmed buyer or seller actor                                                    | Own `Order`; seller must own both sellerId and shopId                                            |
| PATCH `/orders/:id/status`                                | SELLER actor; `{expectedStatus,status}`; `Idempotency-Key: tg:<callback-query-id>` | Own updated `Order`, atomic CAS and history/notification transaction                             |
| POST `/notifications/claim`                               | Worker; `{limit:10,leaseSeconds:60}`                                               | `{jobs:Job[]}`, max 10; no duplicate lease across workers                                        |
| POST `/notifications/:id/begin`                           | Worker; `{leaseToken}`                                                             | `{started:true}` once per valid attempt, otherwise `{started:false}` or 409                      |
| POST `/notifications/:id/ack`                             | Worker; `{leaseToken,messageId}`                                                   | 2xx durable receipt, idempotent for the same attempt/message                                     |
| POST `/notifications/:id/fail`                            | Worker; `{leaseToken,state,code,retryAt?}`                                         | 2xx durable delivery failure/update; allowed states below                                        |

Bridge identity example (role vocabulary intentionally differs from current Go `/me`):

```json
{
  "linked": true,
  "confirmed": true,
  "telegramId": "123456789",
  "botStarted": true,
  "user": {
    "id": "existing-mongo-user-id",
    "role": "SELLER",
    "status": "active"
  },
  "shopId": "existing-shop-id"
}
```

Map Go `customer` → `CLIENT`, `seller` → `SELLER`; `ADMIN` must come from existing backend/admin authority, never a phone/contact claim. Configured numeric Telegram admins retain existing bot admin access; this integration does not grant new Go permissions. IDs exposed in callbacks must be stable ASCII `[A-Za-z0-9_-]{1,36}` (Mongo ObjectIDs and UUIDs fit). Positive private Telegram IDs are decimal strings, not groups/channels/usernames.

## Account binding: contact is not account proof

The bot checks private sender identity and `contact.user_id === message.from.id`, normalizes E.164 and starts a challenge. Go must not bind on that call and must not create an account. Return a generic short-lived response for unmatched phone numbers too, without leaking whether an account exists. Random challenge IDs must have at least 192 bits of entropy encoded as URL-safe 32–128 characters; store only a digest if possible, with TTL at most 10 minutes, actor Telegram ID, normalized phone and candidate existing UID. Send a same-origin confirmation URL configured by Go, e.g. `https://bakeu.uz/#/telegram/link?challenge=<id>`; never accept a caller-supplied redirect origin.

At confirmation require the existing normal Go session, fresh password verification (or the existing equally strong reauthentication mechanism), current account status and equality of the challenge's phone/candidate UID to the authenticated account. For an unverified account phone, require the normal trusted phone-ownership verification as well; never promote a merely self-entered phone into proof. Consume challenge and set unique confirmed Telegram ↔ UID binding atomically. Unique indexes on normalized Telegram ID and user ID prevent competing/replayed reassignment. A different existing binding returns 409; no auto-merge, role change or silent unlink. Expired/consumed challenges fail. Store confirmedAt and botStarted only when established by real bot interaction. `GET /me` on the bridge returns linked/confirmed only after commit. Account freeze/unlink must invalidate subsequent bridge actions and claimed notification recipients.

Mounting the browser confirmation route belongs to the other Codex's shared-auth integration, as documented in `WEBSITE-INTEGRATION.md`. Without that route a link is not complete.

The private contact/challenge interaction establishes that this Telegram actor has actually messaged the bot; retain that activity with the challenge/binding in Mongo and set `botStarted` on confirmed linkage. Subsequent authenticated bridge `/me` calls originate from private bot interactions and can refresh that activity, including after the user unblocks the bot. Do not infer `botStarted` from a website-entered Telegram ID. Claim/begin must still recheck the current confirmed binding and blocked/frozen status.

## Order snapshot and state machine

Shared `Order` fields used by the clients:

```text
id, number, customerId, sellerId, shopId, shopName,
buyerName, buyerPhone, items[{productId,title,price,qty}], total,
fulfillment: pickup|delivery, address, scheduledAt, comment,
location: null|{latitude,longitude}, status, version,
createdAt, updatedAt, history[{status,at,actorId?,version?}]
```

Expose `address` as the stored `deliveryAddress` projection to avoid duplicating storage fields. Use the same IDs and snapshot for website, bridge and notification events. Prices use the existing backend currency convention (sum), not a new pricing database. History timestamps and actor are written by Go, never by clients. For the current acyclic workflow a history has at most nine entries; do not manufacture missing historic steps during migration.

| From                             | Allowed next states   |
| -------------------------------- | --------------------- |
| pending                          | accepted, rejected    |
| accepted                         | preparing, cancelled  |
| preparing                        | ready, cancelled      |
| ready (delivery)                 | delivering, cancelled |
| ready (pickup)                   | completed, cancelled  |
| delivering                       | delivered             |
| delivered                        | completed             |
| completed / cancelled / rejected | none                  |

No skipping, reopening or courier states for pickup. Current actor must own the order at mutation time. CAS includes seller/shop IDs and expected current status/version in the Mongo update predicate. A repeated key returns the original result; a new key with stale expected state returns 409. Increment version and append exactly one history event, website inbox notice and durable outbox intent in one Mongo transaction. Parallel bot/site updates must not both succeed. Cancellation does not delete the order.

## Durable Mongo outbox/inbox and Telegram uncertainty

Create one immutable event snapshot per committed order revision and recipient. Enforce a unique dedup key `(orderId,version,recipientUserId,kind)` for kinds `order.created` (seller and buyer) and `order.status_changed` (buyer). Keep the user's website inbox even if Telegram is unlinked, has not started, is blocked or fails. Resolve the **current** confirmed active binding when claiming/beginning delivery, not only the old snapshot's phone/Telegram ID. Preserve per-order/recipient event order so delayed notifications do not announce an older state after a newer one. Go owns retry schedule, attempts, lease tokens, receipts and dedup indexes; an in-process timer is not the durable outbox.

Job shape: `{id,leaseToken,attempts,kind,recipient:Identity,order:Order}`. `claim` atomically reserves due jobs for 60 seconds. `begin` atomically moves `leased → sending`, verifies the same valid lease/binding and can return started true **once**. Parallel/replayed begin cannot authorize another send.

Delivery states and recovery:

| Result                                                      | Persisted state / action                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| Telegram returns `message_id`                               | ACK `sent` with the receipt. Repeated same ACK is idempotent.               |
| HTTP 429 explicit rejection                                 | `retry`; honor `retryAt`, capped backoff/jitter and maximum attempts in Go. |
| HTTP 403                                                    | `blocked`; keep website notification; no hot-loop retry.                    |
| Other known HTTP 4xx                                        | `failed`; record sanitized code, preserve inbox.                            |
| Timeout, disconnected response, HTTP 5xx or unknown receipt | `uncertain`; preserve inbox; do not automatically replay the send.          |
| Leased worker dies before `begin`                           | Lease may safely return to due/pending.                                     |
| Worker dies after durable `begin`                           | Expired `sending` becomes `uncertain`, never blindly pending.               |

Telegram `sendMessage` has no idempotency key: exactly-once delivery cannot be guaranteed across a crash between send and receipt persistence. The safe policy avoids automatic duplicate sends by retaining `uncertain` for review. Do not claim guaranteed delivery in that case. Any explicit retry of an uncertain event must acknowledge possible duplication.

The worker's bounded memory map retries **ACKs only**, never order storage or notification sends. A transient ACK failure retries the same receipt and lease; Go should accept that late receipt for the matching attempt even after marking it uncertain, provided it has not been reassigned. A 409 means a definitive invalid/reassigned attempt and stops that ACK retry. If failure/ACK calls themselves fail, the Mongo lease sweeper must recover as above. Never mutate/delete an order because a notification failed. Do not include password/token or full raw error bodies in logs or website inbox.

## Location privacy

Only the authenticated buyer, the owning seller and existing authorized admin backend paths may read the order's address/GPS. The bot sends a native Telegram Location only on the owning seller's explicit button click, to the validated private chat; recipient/chat IDs in order payloads are ignored. Without coordinates it shows the text address. The website loads OpenStreetMap tiles only after opening the map; no automatic reverse-geocoding or third-party address API is used. GPS permission is requested only on the user's button click and coordinates can be removed. Use the project's existing consent/retention policy in Go; do not put exact GPS in public catalog DTOs or logs.

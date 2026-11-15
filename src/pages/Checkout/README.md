# Multi-seller checkout

`/#/cart` → `/#/checkout` → `/#/orders/:checkoutId`. Individual orders are also
available at `/#/orders/:orderId`, and the buyer's list is `/#/orders`.

The checkout uses the existing storefront catalog, account session and local
workspace. The Telegram/auth API currently has no order, catalog or seller
notification endpoints. Orders and chat messages in this implementation remain
browser-local, including for accounts whose login is stored on the server.
They do not update the independent admin demo records.

## Customer flow

- Inspect products grouped by seller, with photos, variant labels and subtotals.
- Enter buyer name and Uzbek phone number. A saved profile/address pre-fills the
  form, and the draft survives login/registration in the same tab.
- Choose pickup or delivery, future date/time and a note separately for each
  seller. Delivery requires an address. Delivery availability and fees are agreed
  directly and are not silently included in product totals.
- Contact each seller before submitting. Telephone numbers and business hours
  come from that seller's shop record. Seed shop contacts are explicitly marked
  as examples; replace them with real business contacts before production.
- Call, open a prepared SMS, copy the per-seller message, or enter the existing
  local BakeU chat. SMS links compose a message on the customer's device. The
  customer confirms sending in their messaging app; opening a link does not
  claim the message was sent or delivered.
- The buyer marks each seller's availability/time as agreed. Changing the date,
  time, method, quantity, variant or price invalidates that acknowledgement.
- Saving creates one request per shop and a matching local chat message in one
  workspace write. Each request starts as New / awaiting seller confirmation.
  A buyer's acknowledgement is not a seller's acceptance.
- Receipts preserve product/contact/schedule snapshots and status history. The
  local seller can accept and progress their own order from their workspace or
  order detail page. Other buyers cannot open the receipt through the UI.

## Consistency

Checkout rebuilds prices, variants and shop IDs from the current catalog instead
of trusting stale cart snapshots. Unavailable records, invalid quantities,
past dates, invalid phones and incomplete seller acknowledgements prevent the
whole checkout. Product variant IDs are preserved, including legacy cart items
without shop metadata. Seller accounts can buy from other stores but not their own.

Each draft has an idempotency ID. Repeated submission returns the existing
requests without duplicating chat messages. A failed workspace storage write
leaves the cart and workspace unchanged. Cart consumption happens after saving,
subtracts only ordered quantities, and records consumed checkout IDs to prevent
repeat subtraction. If cart storage fails, the receipt explicitly tells the
buyer the requests were saved and the cart needs manual cleanup.

Local storage is not server authorization, inventory reservation, payment
processing or a cross-device order service. Production order handling should use
an authenticated server endpoint that validates catalog prices/availability,
creates the seller orders in a transaction and queues a notification per order.
For automatic notifications, connect a provider such as Eskiz SMS, or link a
seller's verified Telegram chat to their account. Keep provider credentials on
the server; deduplicate queued messages by order ID and record provider delivery
callbacks before showing sent/delivered statuses. The existing registration
notification bot does not yet deliver seller orders.

## Verification

```sh
node --test src/store/checkout.test.js
npm run build
```

Browser verification covers the three-seller basket (including a cake variant),
registration return, persistent draft, per-seller SMS contents, storage failure,
seller status updates/history, receipt access, cart consumption, and widths from
320 to 1440 px. No real SMS is sent during tests.

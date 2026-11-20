# Mounting the isolated website components

These are real React components and API calls, deliberately isolated from the parallel Codex's auth/routes/checkout changes. This branch does not mount them into the legacy localStorage checkout or use its Node/SQLite tokens. Do not mistake an unmounted component for an already synchronized production page.

## One authenticated transport

Pass the shared Go client's transport to `createWebsiteOrdersClient` from `src/telegramOrders/client.js`. Its contract is `request(path, {method,body,headers,signal}) → parsed JSON`, with paths relative to `/api`.

The existing auth integration must add its current Go access token, refresh it using the shared refresh flow, serialize bodies, reject non-2xx responses, honor AbortSignal and return parsed JSON. Never use the new bridge secret in this transport, invent a second session or pass the legacy `src/bot/client/accountApi.js` session token. Memoize the orders client per authenticated session.

```jsx
const ordersClient = useMemo(
  () => createWebsiteOrdersClient(goAuthenticatedRequest),
  [goAuthenticatedRequest],
);

// sessionKey changes on logout, login and account switch; it is an opaque
// session identity, not the access token or password. Do not render signed out.
return goUser ? (
  <>
    <ServerOrdersPanel
      client={ordersClient}
      sessionKey={sessionKey}
      transitionsEnabled={backendCapabilities.workflowVersion === 2}
    />
    <ServerNotifications client={ordersClient} sessionKey={sessionKey} />
  </>
) : (
  <LoginRequired />
);
```

`ServerOrdersPanel` uses existing Go GET `/me` and `/orders`, selects `incoming` for sellers and `placed` for buyers, double-checks owner IDs and polls every five seconds. Session changes remount/clear the view; request abort/cleanup avoids displaying the previous user's orders. Mutations require the V2 server capability response too, even if the UI flag is enabled. They show success only after a successful backend response; the next read displays server history. `OrderProgress` renders only the current server step and actual timestamped history; pickup omits courier steps. `ServerNotifications` displays the user's persisted inbox and explains unconfirmed Telegram delivery; mount it in the shared notifications area. Refresh/remount it when the shared event stream reports a change, or use the surrounding existing polling mechanism.

## Confirmation route

In the shared authenticated router add `/#/telegram/link?challenge=<id>` on the configured website origin/path. Preserve `challenge` while the existing login/reauthentication page opens, without placing passwords or access tokens in the URL. Mount:

```jsx
<TelegramLinkConfirm
  key={`${sessionKey}:${challengeId}`}
  client={ordersClient}
  challengeId={challengeId}
/>
```

Only a real successful `/api/me/telegram/link/confirm` response sets the success state. The password is held only in the form state, cleared on success and never stored in browser storage or sent to Telegram. Go must perform fresh proof and atomic binding described in the backend contract; this component alone cannot bind an account. A frozen/other/unverified account must fail on the server. The bot's “Проверить привязку” then reloads Go identity.

## Checkout fields and submission

Use `DeliveryFields` inside the existing shared-backend checkout form, with controlled `value`/`onChange` and actual `pickupAvailable` from each shop. For a cart spanning multiple shops, keep independent delivery choices per shop and submit using the backend owner's agreed multi-shop checkout representation. The current client accepts **one** delivery choice applied to the orders in that request; if shops need different schedules, extend the request contract with per-shop choices atomically in the shared backend before mounting that variant. Do not split a multi-shop cart into independent destructive checkout requests: the current Go checkout clears the cart transactionally.

```jsx
<DeliveryFields
  value={delivery}
  onChange={setDelivery}
  pickupAvailable={shop.pickupAvailable}
/>;

// On submit, reuse a key for retries of this exact logical checkout.
// A materially changed cart/delivery gets a new key. Disable while pending.
const result = await ordersClient.checkout({
  items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
  delivery,
  requestId: checkoutAttemptId,
});
// Show result.orders only after server commit. Do not append a local history.
```

`deliveryPayload` validates a future real calendar date/time (Asia/Tashkent → UTC), lengths and coordinates. Pickup strips location/address. Client prices/UID/seller/status are never submitted. Go must repeat validation and create authoritative snapshots; browser checks do not authorize anything. Capabilities are checked before writes so the old backend cannot silently discard schedule/location.

The map is opened by the user and uses OpenStreetMap tiles, with click-to-select coordinates and an optional manual address. It does not invent an address from a map point. GPS is requested only after pressing “Использовать GPS”; a delayed response preserves edits and does not update an unmounted form or a form switched to pickup. Denied GPS leaves manual address entry available. Display delivery price/payment/availability using the real shop/backend rules; this module does not invent paid delivery, SMS or a payment gateway.

The other Codex owns mounting these modules in Buyer Profile, Seller Dashboard, checkout and the shared router after its API/auth stages are ready. All styles are scoped under `tg-orders-*`, preserving the winter theme and avoiding global CSS changes.

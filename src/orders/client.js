import { deliveryPayload, statusLabels } from "./domain.js";
// Inject the authenticated Backend transport owned by the account integration. Never
// read the legacy browser session or cache orders in browser storage.
export function createWebsiteOrdersClient(request, { audience = "auto" } = {}) {
  if (typeof request !== "function")
    throw new Error("An authenticated Backend API transport is required.");
  async function requireWorkflowV2() {
    const capabilities = await request("/orders/capabilities");
    if (
      capabilities?.workflowVersion !== 2 ||
      capabilities.idempotency !== true ||
      capabilities.history !== true ||
      capabilities.deliveryScheduling !== true
    )
      throw new Error("Сервер ещё не поддерживает полное оформление заказов.");
    return capabilities;
  }
  return {
    async load(signal) {
      const user = await request("/me", { signal });
      if (!user?.uid || !["seller", "customer"].includes(user.role))
        throw new Error("Войдите в аккаунт BakeU.");
      const result = await request("/orders", { signal });
      const selling = audience === "seller" || audience === "auto" && user.role === "seller";
      if (selling && user.role !== "seller") throw new Error("Нет доступа к заказам продавца.");
      const orders = selling ? result.incoming : result.placed;
      if (
        !Array.isArray(orders) ||
        orders.some((o) =>
          selling
            ? o.sellerId !== user.uid
            : o.customerId !== user.uid,
        )
      )
        throw new Error("Неверный ответ сервера заказов.");
      return { user, orders, audience: selling ? "seller" : "buyer" };
    },
    async confirmLink(challengeId, password) {
      if (
        !/^[A-Za-z0-9_-]{32,128}$/.test(challengeId || "") ||
        !password ||
        password.length > 256
      )
        throw new Error("Проверьте ссылку и пароль.");
      const result = await request("/me/telegram/link/confirm", {
        method: "POST",
        body: { challengeId, password },
      });
      if (result?.linked !== true || result.confirmed !== true)
        throw new Error("Привязка не подтверждена сервером.");
      return result;
    },
    async transition(order, status, requestId) {
      await requireWorkflowV2();
      return request(`/orders/${encodeURIComponent(order.id)}/status`, {
        method: "PATCH",
        body: {
          status,
          expectedStatus: order.status,
          expectedVersion: order.version,
        },
        headers: { "Idempotency-Key": requestId },
      });
    },
    async checkout({ items, delivery, deliveries, requestId, cartRevision }) {
      const capabilities = await requireWorkflowV2();
      if (!Array.isArray(items) || !items.length || !requestId)
        throw new Error("Сначала проверьте корзину.");
      if (items.some((item) => item.variantId) && capabilities.variantSnapshots !== true)
        throw new Error("Сервер ещё не поддерживает заказ выбранного варианта товара.");
      if (cartRevision !== undefined && capabilities.cartRevision !== true)
        throw Error("Сервер ещё не поддерживает безопасное оформление корзины.");
      const result = await request("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": requestId },
        body: {
          ...(cartRevision !== undefined ? { cartRevision } : {}),
          items: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            ...(item.variantId ? { variantId: item.variantId } : {}),
          })),
          ...(deliveries
            ? { deliveries: checkoutDeliveries(deliveries) }
            : deliveryPayload(delivery)),
        },
      });
      if (
        !Array.isArray(result?.orders) ||
        !result.orders.length ||
        result.orders.some(
          (order) => !order.id || !Object.hasOwn(statusLabels, order.status),
        )
      )
        throw new Error("Сервер не подтвердил заказ.");
      return result;
    },
    complain(id, subject) {
      return request(`/orders/${encodeURIComponent(id)}/complaints`, { method: "POST", body: { subject } });
    },
    async notifications(signal) {
      const user = await request("/me", { signal });
      const result = await request("/me/notifications", { signal });
      if (
        !user?.uid ||
        !Array.isArray(result?.items) ||
        result.items.some((item) => item.userId !== user.uid)
      )
        throw new Error("Неверный ответ сервера уведомлений.");
      return result;
    },
    readNotification(id) {
      return request(`/me/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" });
    },
  };
}

// Multi-shop choices share one atomic checkout and one idempotency key.
export function checkoutDeliveries(deliveries) {
  return Object.fromEntries(
    Object.entries(deliveries).map(([shopId, delivery]) => [
      shopId,
      deliveryPayload(delivery),
    ]),
  );
}

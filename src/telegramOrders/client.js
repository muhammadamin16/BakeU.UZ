import { deliveryPayload, statusLabels } from "./domain.js";
// Inject the Go-authenticated transport owned by the account integration. Never
// read the legacy Node/SQLite session or cache orders in browser storage.
export function createWebsiteOrdersClient(request) {
  if (typeof request !== "function")
    throw new Error("An authenticated Go API transport is required.");
  async function requireWorkflowV2() {
    const capabilities = await request("/orders/capabilities");
    if (
      capabilities?.workflowVersion !== 2 ||
      capabilities.idempotency !== true ||
      capabilities.history !== true ||
      capabilities.deliveryScheduling !== true
    )
      throw new Error("Сервер ещё не поддерживает полное оформление заказов.");
  }
  return {
    async load(signal) {
      const user = await request("/me", { signal });
      if (!user?.uid || !["seller", "customer"].includes(user.role))
        throw new Error("Войдите в аккаунт BakeU.");
      const result = await request("/orders", { signal });
      const orders = user.role === "seller" ? result.incoming : result.placed;
      if (
        !Array.isArray(orders) ||
        orders.some((o) =>
          user.role === "seller"
            ? o.sellerId !== user.uid
            : o.customerId !== user.uid,
        )
      )
        throw new Error("Неверный ответ сервера заказов.");
      return { user, orders };
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
    async checkout({ items, delivery, deliveries, requestId }) {
      await requireWorkflowV2();
      if (!Array.isArray(items) || !items.length || !requestId)
        throw new Error("Сначала проверьте корзину.");
      const result = await request("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": requestId },
        body: {
          items: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
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
    async notifications(signal) {
      const user = await request("/me", { signal });
      const result = await request("/me/notifications", { signal });
      if (
        !user?.uid ||
        !Array.isArray(result?.items) ||
        result.items.some((item) => item.userId !== user.uid)
      )
        throw new Error("Неверный ответ сервера уведомлений.");
      return result.items;
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

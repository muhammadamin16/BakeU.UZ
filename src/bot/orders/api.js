import { statusLabels, validCoordinates } from "./domain.js";
export class BridgeError extends Error {
  constructor(status = 503, code) {
    super(
      status === 409
        ? "Данные изменились. Обновите экран и повторите действие."
        : status === 403
          ? "Недостаточно прав."
          : status === 404
            ? "Раздел пока недоступен. Попробуйте позже."
            : "Сервис заказов временно недоступен.",
    );
    this.status = status;
    if (["SELLER_NOT_FOUND", "ACCOUNT_NOT_FOUND"].includes(code))
      this.code = code;
  }
}
export const validId = (id) =>
  typeof id === "string" && /^[A-Za-z0-9_-]{1,36}$/.test(id);
export function validateIdentity(data, telegramId) {
  if (data?.linked === false) return null;
  const roles = {
    CLIENT: "CLIENT",
    SELLER: "SELLER",
    ADMIN: "ADMIN",
    client: "CLIENT",
    buyer: "CLIENT",
    customer: "CLIENT",
    seller: "SELLER",
    admin: "ADMIN",
  };
  const role = Object.hasOwn(roles, data?.user?.role || "")
    ? roles[data.user.role]
    : null;
  if (
    !/^[1-9]\d{0,19}$/.test(String(telegramId)) ||
    !data ||
    data.confirmed !== true ||
    String(data.telegramId) !== String(telegramId) ||
    !validId(data.user?.id) ||
    !role ||
    data.user.status !== "active" ||
    (role === "SELLER" && !validId(data.shopId))
  )
    throw new BridgeError(502);
  return { ...data, user: { ...data.user, role } };
}
export function validateOrder(order) {
  if (
    !order ||
    !validId(order.id) ||
    !validId(order.customerId) ||
    !validId(order.sellerId) ||
    !validId(order.shopId) ||
    !Object.hasOwn(statusLabels, order.status) ||
    !["pickup", "delivery"].includes(order.fulfillment) ||
    !Number.isFinite(order.total) ||
    order.total < 0 ||
    order.total > 1e12 ||
    !Array.isArray(order.items) ||
    order.items.length > 100 ||
    !order.items.every(
      (item) =>
        typeof item.title === "string" &&
        Number.isFinite(item.price) &&
        item.price >= 0 &&
        item.price <= 1e12 &&
        item.qty <= 1000 &&
        Number.isInteger(item.qty) &&
        item.qty > 0,
    ) ||
    (order.location != null && !validCoordinates(order.location))
  )
    throw new BridgeError(502);
  return order;
}
/** @returns {import('./contracts').TelegramBridge} */
export function createOrdersApi(config, { fetchImpl = fetch } = {}) {
  async function request(actor, path, method = "GET", body, key) {
    if (!config.enabled) throw new BridgeError();
    if (actor != null && !/^[1-9]\d{0,19}$/.test(String(actor)))
      throw new BridgeError(403);
    let response;
    try {
      response = await fetchImpl(
        `${config.baseUrl}/api/integrations/telegram${path}`,
        {
          method,
          redirect: "error",
          signal: AbortSignal.timeout(12000),
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/json",
            ...(actor != null ? { "X-Telegram-User-Id": String(actor) } : {}),
            ...(key ? { "Idempotency-Key": key } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      );
    } catch {
      throw new BridgeError();
    }
    if (!response.ok) {
      let code;
      try {
        code = (await response.json())?.code;
      } catch {
        /* Missing API is not an account-not-found result. */
      }
      throw new BridgeError(
        response.status === 401 ? 503 : response.status,
        code,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new BridgeError(502);
    }
  }
  return {
    identity: async (actor) =>
      validateIdentity(await request(actor, "/me"), actor),
    startLink: (actor, phone, requestedRole = "CLIENT") => {
      if (!["CLIENT", "SELLER"].includes(requestedRole))
        throw new BridgeError(400);
      return request(actor, "/link/challenges", "POST", {
        phone,
        requestedRole,
      });
    },
    shop: (actor) => request(actor, "/shop"),
    products: (actor) => request(actor, "/shop/products"),
    list: (actor, audience, view, page = 0) =>
      request(
        actor,
        `/orders?audience=${encodeURIComponent(audience)}&view=${encodeURIComponent(view)}&page=${page}&limit=5`,
      ),
    order: async (actor, id) => {
      if (!validId(id)) throw new BridgeError(400);
      return validateOrder(
        await request(actor, `/orders/${encodeURIComponent(id)}`),
      );
    },
    transition: async (actor, id, expectedStatus, status, key) => {
      if (
        !validId(id) ||
        !Object.hasOwn(statusLabels, status) ||
        !Object.hasOwn(statusLabels, expectedStatus) ||
        !/^[A-Za-z0-9:_-]{1,100}$/.test(key)
      )
        throw new BridgeError(400);
      return validateOrder(
        await request(
          actor,
          `/orders/${id}/status`,
          "PATCH",
          { expectedStatus, status },
          key,
        ),
      );
    },
    claim: () =>
      request(null, "/notifications/claim", "POST", {
        limit: 10,
        leaseSeconds: 60,
      }),
    begin: (job) =>
      request(
        null,
        `/notifications/${encodeURIComponent(job.id)}/begin`,
        "POST",
        { leaseToken: job.leaseToken },
      ),
    ack: (job, receipt) =>
      request(
        null,
        `/notifications/${encodeURIComponent(job.id)}/ack`,
        "POST",
        { leaseToken: job.leaseToken, messageId: receipt },
      ),
    fail: (job, failure) =>
      request(
        null,
        `/notifications/${encodeURIComponent(job.id)}/fail`,
        "POST",
        { leaseToken: job.leaseToken, ...failure },
      ),
  };
}

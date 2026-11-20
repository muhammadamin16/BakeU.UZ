export const statusLabels = Object.freeze({
  pending: "Оформлен",
  accepted: "Принят",
  preparing: "Готовится",
  ready: "Готов",
  delivering: "В доставке",
  delivered: "Доставлен",
  completed: "Выполнен",
  cancelled: "Отменён",
  rejected: "Отклонён",
});
export const terminalStatuses = new Set(["completed", "cancelled", "rejected"]);
export function nextStatuses(status, fulfillment) {
  const graph = {
    pending: ["accepted", "rejected"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready:
      fulfillment === "pickup"
        ? ["completed", "cancelled"]
        : ["delivering", "cancelled"],
    delivering: ["delivered"],
    delivered: ["completed"],
  };
  return Object.hasOwn(graph, status) ? graph[status] : [];
}
export const statusCodes = Object.freeze({
  p: "pending",
  a: "accepted",
  c: "preparing",
  r: "ready",
  d: "delivering",
  v: "delivered",
  f: "completed",
  x: "cancelled",
  j: "rejected",
});
export const codeOf = (status) =>
  Object.keys(statusCodes).find((key) => statusCodes[key] === status);
export function normalizePhone(value) {
  if (typeof value !== "string") throw new Error("Неверный телефон.");
  let result = value.trim().replace(/[\s()-]/g, "");
  if (result.startsWith("00")) result = "+" + result.slice(2);
  if (/^[1-9]\d{7,14}$/.test(result)) result = "+" + result;
  if (!/^\+[1-9]\d{7,14}$/.test(result))
    throw new Error("Телефон должен содержать код страны.");
  return result;
}
export function validCoordinates(value) {
  return Boolean(
    value &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180,
  );
}
export function ownOrder(identity, order) {
  if (!identity?.confirmed || !identity.user || !order) return false;
  if (identity.user.role === "SELLER")
    return (
      order.sellerId === identity.user.id && order.shopId === identity.shopId
    );
  return (
    identity.user.role === "CLIENT" && order.customerId === identity.user.id
  );
}
export function deliveryInstant(date, time, now = Date.now()) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new Error("Выберите дату и время.");
  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  )
    throw new Error("Неверная дата.");
  const result = new Date(`${date}T${time}:00+05:00`);
  if (result.getTime() <= now || result.getTime() > now + 366 * 86400000)
    throw new Error("Выберите время в будущем, не дальше года.");
  return result.toISOString();
}
export function deliveryPayload(value, now = Date.now()) {
  const fulfillment = value.fulfillment || "delivery";
  if (!["pickup", "delivery"].includes(fulfillment))
    throw new Error("Неверный способ получения.");
  const address = String(value.address || "").trim();
  if (fulfillment === "delivery" && (!address || address.length > 500))
    throw new Error("Введите адрес (до 500 символов).");
  if (
    fulfillment === "delivery" &&
    value.location != null &&
    !validCoordinates(value.location)
  )
    throw new Error("Неверные координаты.");
  if (String(value.comment || "").length > 1000)
    throw new Error("Комментарий слишком длинный.");
  return {
    fulfillment,
    deliveryAddress: fulfillment === "pickup" ? "" : address,
    location:
      fulfillment === "delivery" && value.location
        ? {
            latitude: value.location.latitude,
            longitude: value.location.longitude,
          }
        : null,
    scheduledAt: deliveryInstant(value.date, value.time, now),
    comment: String(value.comment || "").trim(),
  };
}

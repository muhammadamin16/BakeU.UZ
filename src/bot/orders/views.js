import { escapeHtml as e } from "../utils/html.js";
import { timestamp } from "../utils/formatMessage.js";
import {
  codeOf,
  nextStatuses,
  statusLabels,
  validCoordinates,
} from "../../telegramOrders/domain.js";
export const text = (value, max = 160) => {
  let result = "";
  for (const char of String(value ?? "—")) {
    const next = e(char);
    if (result.length + next.length > max) break;
    result += next;
  }
  return result;
};
export const money = (value) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) +
  " сум";
const at = (value) =>
  Number.isFinite(Date.parse(value)) ? timestamp(value) : "не указано";
const button = (label, data) => ({ text: label, callback_data: data });
export const mainBack = [button("🔙 Главное меню", "main")];
export function transitionButtons(order) {
  const labels = {
    accepted: "✅ Принять заказ",
    rejected: "❌ Отклонить",
    preparing: "👨‍🍳 Начать приготовление",
    ready: "🥐 Заказ готов",
    delivering: "🚚 Передать в доставку",
    delivered: "✅ Отметить доставленным",
    completed:
      order.fulfillment === "pickup"
        ? "🎉 Выдать и завершить"
        : "🎉 Завершить заказ",
    cancelled: "❌ Отменить заказ",
  };
  return nextStatuses(order.status, order.fulfillment).map((status) => [
    button(
      labels[status],
      `bo:act:${order.id}:${codeOf(order.status)}:${codeOf(status)}`,
    ),
  ]);
}
export function orderCard(
  order,
  { seller = false, page = 0, notification = false } = {},
) {
  const start = page * 6;
  const items = order.items.slice(start, start + 6);
  const rows = items
    .map(
      (item) =>
        `• ${text(item.title, 80)} × ${item.qty} — ${money(item.price * item.qty)}`,
    )
    .join("\n");
  const history = (order.history || [])
    .slice(-12)
    .map(
      (item) =>
        `${text(statusLabels[item.status] || item.status, 40)} · ${at(item.at)}`,
    )
    .join("\n");
  const heading = notification
    ? seller
      ? "🔔 НОВЫЙ ЗАКАЗ"
      : "✅ Ваш заказ успешно оформлен!"
    : "📦 ЗАКАЗ";
  const body = `<b>${heading} #${text(order.number || order.id, 40)}</b>\n\n🏬 ${text(order.shopName)}${seller ? `\n👤 ${text(order.buyerName)}\n📱 ${text(order.buyerPhone, 24)}` : ""}\n\n${rows}\n\n<b>💰 Итого: ${money(order.total)}</b>\nСтатус: ${text(statusLabels[order.status])}\n${order.fulfillment === "pickup" ? "🏬 Самовывоз" : "🚚 Доставка"}\n📍 ${text(order.address, 240)}\n🕒 ${at(order.scheduledAt)}\nСоздан: ${at(order.createdAt)}${order.comment ? `\n💬 ${text(order.comment, 300)}` : ""}${history ? `\n\n<b>История статусов</b>\n${history}` : ""}`;
  const keyboard = seller ? transitionButtons(order) : [];
  if (page > 0)
    keyboard.push([
      button("‹ Предыдущие товары", `bo:detail:${order.id}:${page - 1}`),
    ]);
  if (start + 6 < order.items.length)
    keyboard.push([
      button("Следующие товары ›", `bo:detail:${order.id}:${page + 1}`),
    ]);
  if (seller && validCoordinates(order.location))
    keyboard.push([button("📍 Локация", `bo:location:${order.id}`)]);
  if (seller && /^\+[1-9]\d{7,14}$/.test(order.buyerPhone || ""))
    keyboard.push([button("📞 Связаться", `bo:contact:${order.id}`)]);
  if (notification)
    keyboard.push([button("📦 Подробнее", `bo:detail:${order.id}:0`)]);
  keyboard.push(mainBack);
  return { text: body, reply_markup: { inline_keyboard: keyboard } };
}
export function shopCard(shop) {
  const counts = shop.counts || {};
  return `<b>🏬 МОЙ МАГАЗИН — BAKEU</b>\n\n${text(shop.name)}\nТелефон: ${text(shop.phone, 24)}\nАдрес: ${text(shop.address, 240)}\n\nТоваров: ${shop.productCount}\nНовых заказов: ${counts.pending || 0}\nПринятых: ${counts.accepted || 0}\nГотовится: ${counts.preparing || 0}\nГотово: ${counts.ready || 0}\nДоставка: ${counts.delivering || 0}\nВыполнено: ${counts.completed || 0}\nОбщая выручка: ${money(shop.revenue)}`;
}
export function firstPartyLink(config, hash) {
  const url = new URL(config.siteUrl);
  url.hash = hash;
  return url.href;
}

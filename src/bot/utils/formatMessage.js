import { escapeHtml as e } from "./html.js";
export const timestamp = (value) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
export const nameOf = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.name ||
  "Без имени";
export function accountMessage(user) {
  return `<b>${user.role === "seller" ? "🧑‍🍳 Новый продавец" : "👥 Новый покупатель"}</b>\n\n<b>${e(nameOf(user))}</b>\n${e(user.phone)}\n${e(user.email)}${user.company ? "\n\nМагазин · " + e(user.company) : ""}\n\n<i>${timestamp(user.createdAt)} · Ташкент</i>\n<code>${e(user.id)}</code>`;
}
export function applicationMessage(app) {
  const mark =
    app.status === "Одобрено" ? "✅" : app.status === "Отклонено" ? "❌" : "🗂";
  return `<b>${mark} Заявка на открытие магазина</b>\n\n<b>${e(app.shop)}</b>\nПродавец · ${e(app.owner)}\nАдрес · ${e(app.address)}\n\nСтатус · <b>${e(app.status)}</b>${app.reason ? "\nПричина · " + e(app.reason) : ""}\n\n<i>${timestamp(app.createdAt)} · Ташкент</i>\n<code>${e(app.id)}</code>`;
}
export function ticketMessage(ticket) {
  return `<b>💬 Поддержка · #${e(ticket.id.slice(0, 8))}</b>\n\n<b>${e(ticket.name)}</b>\n<blockquote>${e(ticket.body)}</blockquote>\n\nСтатус · ${e(ticket.status)}\n<i>${timestamp(ticket.createdAt)} · Ташкент</i>\nTelegram ID · <code>${e(ticket.chatId)}</code>`;
}
export function siteAdminLink(config, path = "") {
  const u = new URL(config.siteUrl);
  u.hash = "/admin" + path;
  return u.href;
}

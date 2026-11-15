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
  return `${user.role === "seller" ? "🏪 Новый продавец" : "👤 Новый покупатель"}\n\nID: ${user.id}\nИмя: ${nameOf(user)}\nТелефон: ${user.phone}\nEmail: ${user.email}${user.company ? "\nМагазин: " + user.company : ""}\nДата: ${timestamp(user.createdAt)}`;
}
export function applicationMessage(app) {
  return `📋 Заявка на открытие магазина\n\nID: ${app.id}\nПродавец: ${app.owner}\nМагазин: ${app.shop}\nАдрес: ${app.address}\nСтатус: ${app.status}\nДата: ${timestamp(app.createdAt)}${app.reason ? "\nПричина: " + app.reason : ""}`;
}
export function ticketMessage(ticket) {
  return `📩 Поддержка #${ticket.id}\nОт: ${ticket.name} (${ticket.chatId})\nДата: ${timestamp(ticket.createdAt)}\nСтатус: ${ticket.status}\n\n${ticket.body}`;
}
export function siteAdminLink(config, path = "") {
  const u = new URL(config.siteUrl);
  u.hash = "/admin" + path;
  return u.href;
}

import { siteAdminLink } from "../utils/formatMessage.js";
export const backAdmin = {
  inline_keyboard: [
    [{ text: "‹ Панель управления", callback_data: "admin:home" }],
  ],
};
export function adminKeyboard(config) {
  return {
    inline_keyboard: [
      [{ text: "📊 Обзор и статистика", callback_data: "admin:stats" }],
      [
        { text: "👥 Покупатели", callback_data: "admin:customers:0" },
        { text: "🧑‍🍳 Продавцы", callback_data: "admin:sellers:0" },
      ],
      [{ text: "🗂 Заявки магазинов", callback_data: "admin:applications:0" }],
      [
        { text: "💬 Обращения", callback_data: "admin:tickets:0" },
        { text: "🔄 Повторить отправку", callback_data: "admin:retry" },
      ],
      [{ text: "↗ Открыть админ сайта", url: siteAdminLink(config) }],
      [{ text: "‹ Главное меню", callback_data: "main" }],
    ],
  };
}
export const applicationKeyboard = (id) => ({
  inline_keyboard: [
    [
      { text: "✓ Одобрить", callback_data: `app:approve:${id}` },
      { text: "✕ Отклонить", callback_data: `app:reject:${id}` },
    ],
  ],
});
export const ticketKeyboard = (id) => ({
  inline_keyboard: [
    [{ text: "💬 Ответить", callback_data: `ticket:reply:${id}` }],
  ],
});
export function pagination(kind, page, hasNext) {
  const row = [];
  if (page > 0)
    row.push({ text: "← Назад", callback_data: `admin:${kind}:${page - 1}` });
  if (hasNext)
    row.push({ text: "Далее →", callback_data: `admin:${kind}:${page + 1}` });
  return {
    inline_keyboard: [
      ...(row.length ? [row] : []),
      [{ text: "‹ Панель управления", callback_data: "admin:home" }],
    ],
  };
}

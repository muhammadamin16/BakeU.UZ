import { miniAppUrl } from "../utils/formatMessage.js";
const siteButton = (config) => ({
  text: "🥐 Открыть BakeU",
  ...(config.useWebApp
    ? { web_app: { url: miniAppUrl(config) } }
    : { url: config.siteUrl }),
});
export function mainKeyboard(config, { admin = false, role = null } = {}) {
  const external = (text, url, key) =>
    url ? { text, url } : { text, callback_data: key };
  return {
    inline_keyboard: [
      [siteButton(config)],
      ...(role === 'SELLER' ? [[{text:'🏬 Мой магазин',callback_data:'bo:shop'}]] : role === 'CLIENT' ? [[{text:'📦 Мои заказы',callback_data:'bo:buyer'}]] : !admin ? [[{text:'🔐 Мой BakeU',callback_data:'bo:account'}]] : []),
      [
        external("📣 Telegram-канал", config.telegramUrl, "contact:telegram"),
        external("📸 Instagram", config.instagramUrl, "contact:instagram"),
      ],
      [
        { text: "💬 Поддержка", callback_data: "support" },
        { text: "✉️ Написать на почту", callback_data: "contact:email" },
      ],
      [{ text: "🤎 О проекте BakeU", callback_data: "about" }],
      ...(admin
        ? [[{ text: "⚙️ Панель администратора", callback_data: "admin:home" }]]
        : []),
    ],
  };
}
export function sectionKeyboard(
  config,
  { email = false, support = true } = {},
) {
  return {
    inline_keyboard: [
      ...(email && config.supportEmail
        ? [
            [
              {
                text: "📋 Скопировать email",
                copy_text: { text: config.supportEmail },
              },
            ],
          ]
        : []),
      [
        siteButton(config),
        ...(support
          ? [{ text: "💬 Поддержка", callback_data: "support" }]
          : []),
      ],
      [{ text: "‹ Главное меню", callback_data: "main" }],
    ],
  };
}
export const cancelKeyboard = {
  inline_keyboard: [
    [{ text: "‹ Отменить и вернуться", callback_data: "main" }],
  ],
};

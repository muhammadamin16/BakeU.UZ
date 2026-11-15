export function mainKeyboard(config) {
  const external = (text, url, key) =>
    url ? { text, url } : { text, callback_data: key };
  return {
    inline_keyboard: [
      [
        {
          text: "🌐 BakeU сайт",
          ...(config.useWebApp
            ? { web_app: { url: config.siteUrl } }
            : { url: config.siteUrl }),
        },
      ],
      [
        external("📢 Telegram", config.telegramUrl, "contact:telegram"),
        external("📸 Instagram", config.instagramUrl, "contact:instagram"),
      ],
      [
        { text: "✉️ Email", callback_data: "contact:email" },
        { text: "🛟 Поддержка", callback_data: "support" },
      ],
      [{ text: "ℹ️ О BakeU", callback_data: "about" }],
    ],
  };
}

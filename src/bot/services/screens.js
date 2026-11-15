import { readFile } from "node:fs/promises";
let banner;
async function readBanner() {
  banner ||= readFile(new URL("../assets/welcome.png", import.meta.url));
  return banner;
}
// Navigate inside the existing bot message instead of filling the chat with menus.
export async function renderScreen(ctx, payload, { withBanner = false } = {}) {
  const { telegram, chatId, message, callback } = ctx;
  const html = { ...payload, parse_mode: "HTML" };
  if (callback && message?.message_id) {
    try {
      if (message.photo?.length && typeof telegram.editCaption === "function") {
        const { text, ...options } = html;
        return await telegram.editCaption(chatId, message.message_id, {
          ...options,
          caption: text,
        });
      }
      return await telegram.edit(chatId, message.message_id, {
        ...html,
        link_preview_options: { is_disabled: true },
      });
    } catch (error) {
      if (error.reason === "not_modified") return null;
      // Old or removed messages can no longer be edited. Send a fresh screen once.
      if (error.code !== 400) throw error;
    }
  }
  if (withBanner && typeof telegram.photo === "function") {
    try {
      const { text, ...options } = html;
      return await telegram.photo(chatId, await readBanner(), {
        ...options,
        caption: text,
      });
    } catch (error) {
      if (error.code !== 400 && error.code !== "ENOENT") throw error;
    }
  }
  return telegram.send(chatId, {
    ...html,
    link_preview_options: { is_disabled: true },
  });
}

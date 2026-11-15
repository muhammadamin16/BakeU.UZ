import { sectionKeyboard } from "../keyboards/mainKeyboard.js";
import { isAdmin } from "../middleware/adminOnly.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { showMain, publicAction } from "./public.js";
import { adminAction } from "./admin.js";
import { applicationMessage } from "../utils/formatMessage.js";
import { backAdmin } from "../keyboards/adminKeyboard.js";
export function createUpdateHandler({ repo, telegram, config, notifications }) {
  const allow = createRateLimiter({ limit: 20, windowMs: 60000 });
  return async (update) => {
    const callback = update.callback_query;
    const msg = callback?.message || update.message;
    const user = callback?.from || msg?.from;
    if (!msg || !user || user.is_bot) return;
    const chatId = String(msg.chat.id);
    if (msg.chat.type !== "private") {
      if (callback)
        await telegram.answer(callback.id, "Откройте личный чат с ботом.");
      return;
    }
    const admin = isAdmin(config, user.id);
    const ctx = {
      repo,
      telegram,
      config,
      notifications,
      chatId,
      user,
      message: msg,
      callback: Boolean(callback),
    };
    const data = callback?.data || "";
    if (callback) await telegram.answer(callback.id);
    if (!admin && !allow(chatId)) return;
    repo.rememberTelegram(user);
    const text = update.message?.text?.trim() || "";
    const command = text.split(/\s/)[0].split("@")[0];
    if (command === "/id")
      return telegram.send(chatId, { text: `Ваш Telegram ID: ${user.id}` });
    if (command === "/start" || command === "/cancel") {
      repo.clearState(chatId);
      return showMain(ctx);
    }
    if (
      command === "/admin" ||
      data.startsWith("admin:") ||
      data.startsWith("app:") ||
      data.startsWith("ticket:")
    ) {
      if (!admin)
        return telegram.send(chatId, {
          text: "Этот раздел доступен только администратору.",
        });
      repo.clearState(chatId);
      return adminAction(ctx, command === "/admin" ? "admin:home" : data);
    }
    if (callback) {
      repo.clearState(chatId);
      return publicAction(ctx, data);
    }
    const state = repo.getState(chatId);
    if (state) {
      if (!text || text.startsWith("/"))
        return telegram.send(chatId, {
          text: "💬 Отправьте вопрос текстом. Для отмены нажмите /cancel.",
        });
      const max = state.kind === "reject" ? 500 : 2000;
      if (text.length > max)
        return telegram.send(chatId, {
          text: `Максимум ${max} символов. Сократите сообщение.`,
        });
      if (state.kind === "support") {
        const t = repo.newTicket(
          chatId,
          [user.first_name, user.last_name].filter(Boolean).join(" "),
          text,
          notifications.support,
        );
        repo.clearState(chatId);
        return telegram.send(chatId, {
          text: `<b>🤎 Спасибо, мы получили ваш вопрос</b>\n\nОбращение <code>#${t.id.slice(0, 8)}</code> сохранено.\nОтвет поддержки придёт в этот чат.`,
          parse_mode: "HTML",
          reply_markup: sectionKeyboard(config),
        });
      }
      if (!admin) {
        repo.clearState(chatId);
        return;
      }
      if (state.kind === "reply") {
        const t = repo.reply(state.id, user.id, text);
        repo.clearState(chatId);
        return telegram.send(chatId, {
          text: t
            ? "✅ Ответ сохранён и поставлен в очередь отправки."
            : "Обращение не найдено.",
          reply_markup: backAdmin,
        });
      }
      if (state.kind === "reject") {
        const result = repo.decide(state.id, "Отклонено", user.id, text);
        repo.clearState(chatId);
        return telegram.send(chatId, {
          text: result.missing
            ? "Заявка не найдена."
            : applicationMessage(result.application),
          parse_mode: "HTML",
          reply_markup: backAdmin,
        });
      }
    }
    return showMain(ctx);
  };
}

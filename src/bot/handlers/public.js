import {
  mainKeyboard,
  sectionKeyboard,
  cancelKeyboard,
} from "../keyboards/mainKeyboard.js";
import { isAdmin } from "../middleware/adminOnly.js";
import { escapeHtml } from "../utils/html.js";
import { renderScreen } from "../services/screens.js";
export async function showMain(ctx) {
  const admin = isAdmin(ctx.config, ctx.user.id);
  const role = admin ? 'ADMIN' : await ctx.orders?.resolveRole(ctx.user.id);
  return renderScreen(
    ctx,
    {
      text: "<b>BakeU · с теплом к каждому</b>\n\nСвежая выпечка, любимые десерты\nи домашние пекарни — в одном месте.\n\n<i>Выберите, с чего начнём ↓</i>",
      reply_markup: mainKeyboard(ctx.config, {
        admin,
        role,
      }),
    },
    { withBanner: true },
  );
}
export async function publicAction(ctx, action) {
  const { config, repo, chatId } = ctx;
  if (action === "main") {
    repo.clearState(chatId);
    return showMain(ctx);
  }
  if (action === "about")
    return renderScreen(ctx, {
      text: "<b>🤎 BakeU — выпечка с душой</b>\n\nМы соединяем тех, кто любит печь,\nс теми, кто ценит домашний вкус.\n\n<b>Для покупателей</b>\nНаходите десерты и знакомьтесь с пекарнями.\n\n<b>Для продавцов</b>\nСоздайте аккаунт и представьте свой магазин.\n\n<i>Знакомство начинается на сайте.</i>",
      reply_markup: sectionKeyboard(config),
    });
  if (action === "support") {
    repo.setState(chatId, { kind: "support" });
    return renderScreen(ctx, {
      text: "<b>💬 Мы на связи</b>\n\nРасскажите, чем помочь — напишите\nвопрос одним текстовым сообщением.\n\nОтвет придёт прямо в этот чат.\n\n<i>До 2000 символов. Пароли и данные карт не отправляйте.</i>",
      reply_markup: cancelKeyboard,
    });
  }
  if (action === "contact:email")
    return renderScreen(ctx, {
      text: config.supportEmail
        ? `<b>✉️ Напишите нам</b>\n\nДля вопросов и предложений:\n<code>${escapeHtml(config.supportEmail)}</code>\n\n<i>Или свяжитесь с нами через поддержку в боте.</i>`
        : "<b>✉️ Почта BakeU</b>\n\nАдрес скоро появится здесь.\nА пока напишите нам в поддержку — мы на связи.",
      reply_markup: sectionKeyboard(config, { email: true }),
    });
  if (action.startsWith("contact:"))
    return renderScreen(ctx, {
      text: `<b>${action === "contact:instagram" ? "📸 BakeU в Instagram" : "📣 Telegram-канал BakeU"}</b>\n\nГотовим для вас эту страницу.\nПока загляните на сайт или напишите нам.`,
      reply_markup: sectionKeyboard(config),
    });
  return null;
}

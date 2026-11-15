import { mainKeyboard } from "../keyboards/mainKeyboard.js";
import { isAdmin } from "../middleware/adminOnly.js";
export async function showMain(ctx) {
  const { telegram, config, chatId, user } = ctx;
  return telegram.send(chatId, {
    text:
      "🧁 Добро пожаловать в BakeU!\n\nДомашняя выпечка, любимые десерты и магазины рядом. Откройте наш сайт или выберите раздел ниже." +
      (isAdmin(config, user.id)
        ? "\n\nАдминистратору доступна команда /admin."
        : ""),
    reply_markup: mainKeyboard(config),
  });
}
export async function publicAction(ctx, action) {
  const { telegram, config, chatId, repo } = ctx;
  if (action === "main") {
    repo.clearState(chatId);
    return showMain(ctx);
  }
  if (action === "about")
    return telegram.send(chatId, {
      text: "🧁 О BakeU\n\nBakeU — площадка домашней выпечки. Покупатели находят десерты и пекарни, а продавцы представляют свои магазины и товары.\n\nРегистрация покупателя и продавца доступна на сайте. Информация о товарах и заказах — на сайте BakeU.",
      reply_markup: mainKeyboard(config),
    });
  if (action === "support") {
    repo.setState(chatId, { kind: "support" });
    return telegram.send(chatId, {
      text: "🛟 Напишите вопрос одним текстовым сообщением (до 2000 символов). Не отправляйте пароли и данные банковских карт.\nДля отмены: /cancel",
    });
  }
  if (action === "contact:email")
    return telegram.send(chatId, {
      text: config.supportEmail
        ? `✉️ Наша почта: ${config.supportEmail}`
        : "Email пока не указан. Нажмите «Поддержка», чтобы написать нам.",
      reply_markup: mainKeyboard(config),
    });
  if (action.startsWith("contact:"))
    return telegram.send(chatId, {
      text: "Ссылка ещё не добавлена. Следите за обновлениями на сайте BakeU.",
      reply_markup: mainKeyboard(config),
    });
  return null;
}

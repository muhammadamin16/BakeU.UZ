import { renderScreen } from "../services/screens.js";
import {
  adminKeyboard,
  backAdmin,
  pagination,
  applicationKeyboard,
  ticketKeyboard,
} from "../keyboards/adminKeyboard.js";
import {
  accountMessage,
  applicationMessage,
  ticketMessage,
} from "../utils/formatMessage.js";
export async function adminAction(ctx, data) {
  const { telegram, config, repo, chatId, user } = ctx;
  if (data === "admin:home")
    return renderScreen(ctx, {
      text: "<b>BakeU · Панель управления</b>\n\nАккаунты, заявки и поддержка\n— всё важное в одном месте.\n\n<i>Выберите раздел ↓</i>",
      reply_markup: adminKeyboard(config),
    });
  if (data === "admin:stats") {
    const s = repo.stats();
    return renderScreen(ctx, {
      text: `<b>📊 BakeU в цифрах</b>\n\n<b>Сообщество</b>\nПокупатели · ${s.customers}\nПродавцы · ${s.sellers}\nВ боте · ${s.telegram}\n\n<b>Магазины</b>\nЖдут проверки · ${s.pending}\nОдобрены · ${s.approved}\n\n<b>Поддержка</b>\nОткрытые обращения · ${s.tickets}\nНедоставленные уведомления · ${s.failed}`,
      reply_markup: backAdmin,
    });
  }
  if (data === "admin:retry") {
    repo.retryOutbox();
    return renderScreen(ctx, {
      text: "<b>🔄 Повторная отправка</b>\n\nНедоставленные уведомления снова в очереди.\nБот отправит их автоматически.",
      reply_markup: backAdmin,
    });
  }
  if (data.startsWith("app:")) {
    const [, action, id] = data.split(":");
    const app = repo.application(id);
    if (!app)
      return renderScreen(ctx, {
        text: "Заявка не найдена.",
        reply_markup: backAdmin,
      });
    if (app.status !== "На проверке")
      return renderScreen(ctx, {
        text: `Заявка уже обработана: ${app.status}`,
        reply_markup: backAdmin,
      });
    if (action === "reject") {
      repo.setState(chatId, { kind: "reject", id });
      return renderScreen(ctx, {
        text: "<b>✕ Отклонить заявку</b>\n\nНапишите причину одним сообщением.\n<i>До 500 символов.</i>",
        reply_markup: backAdmin,
      });
    }
    if (action === "approve") {
      const result = repo.decide(id, "Одобрено", user.id);
      return renderScreen(ctx, {
        text: applicationMessage(result.application),
        reply_markup: backAdmin,
      });
    }
    return null;
  }
  if (data.startsWith("ticket:reply:")) {
    const id = data.slice("ticket:reply:".length);
    if (!repo.ticket(id))
      return telegram.send(chatId, { text: "Обращение не найдено." });
    repo.setState(chatId, { kind: "reply", id });
    return renderScreen(ctx, {
      text: "<b>💬 Ответить пользователю</b>\n\nНапишите ответ одним сообщением.\n<i>До 2000 символов. Для отмены вернитесь в панель.</i>",
      reply_markup: backAdmin,
    });
  }
  const [, kind, rawPage] = data.split(":");
  const page = Number(rawPage || 0);
  if (!Number.isInteger(page) || page < 0 || page > 100000) return null;
  let rows;
  if (kind === "customers" || kind === "sellers") {
    rows = repo.listUsers(kind === "customers" ? "client" : "seller", page);
    for (const u of rows.slice(0, 5))
      await telegram.send(chatId, {
        text: accountMessage(u),
        parse_mode: "HTML",
      });
  } else if (kind === "applications") {
    rows = repo.listApplications(page);
    for (const a of rows.slice(0, 5))
      await telegram.send(chatId, {
        text: applicationMessage(a),
        parse_mode: "HTML",
        reply_markup:
          a.status === "На проверке" ? applicationKeyboard(a.id) : undefined,
      });
  } else if (kind === "tickets") {
    rows = repo.listTickets(page);
    for (const t of rows.slice(0, 5))
      await telegram.send(chatId, {
        text: ticketMessage(t),
        parse_mode: "HTML",
        reply_markup: ticketKeyboard(t.id),
      });
  } else return null;
  return telegram.send(chatId, {
    text: rows.length ? `Страница ${page + 1}` : "Записей пока нет.",
    reply_markup: pagination(kind, page, rows.length > 5),
  });
}

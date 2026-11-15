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
    return telegram.send(chatId, {
      text: "🔐 BakeU · Админ-панель\nЗдесь отображаются серверные регистрации, заявки и сообщения поддержки.",
      reply_markup: adminKeyboard(config),
    });
  if (data === "admin:stats") {
    const s = repo.stats();
    return telegram.send(chatId, {
      text: `📊 Статистика BakeU\n\n👤 Покупатели: ${s.customers}\n🏪 Продавцы: ${s.sellers}\n📋 На проверке: ${s.pending}\n✅ Магазины одобрены: ${s.approved}\n🤖 Пользователи бота: ${s.telegram}\n📩 Открытые обращения: ${s.tickets}\n⚠️ Недоставленные уведомления: ${s.failed}`,
      reply_markup: backAdmin,
    });
  }
  if (data === "admin:retry") {
    repo.retryOutbox();
    return telegram.send(chatId, {
      text: "Недоставленные уведомления поставлены в очередь повторно.",
      reply_markup: backAdmin,
    });
  }
  if (data.startsWith("app:")) {
    const [, action, id] = data.split(":");
    const app = repo.application(id);
    if (!app) return telegram.send(chatId, { text: "Заявка не найдена." });
    if (app.status !== "На проверке")
      return telegram.send(chatId, {
        text: `Заявка уже обработана: ${app.status}`,
        reply_markup: backAdmin,
      });
    if (action === "reject") {
      repo.setState(chatId, { kind: "reject", id });
      return telegram.send(chatId, {
        text: "Укажите причину отказа (до 500 символов). Отмена: /cancel",
      });
    }
    if (action === "approve") {
      const result = repo.decide(id, "Одобрено", user.id);
      return telegram.send(chatId, {
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
    return telegram.send(chatId, {
      text: "Напишите ответ пользователю одним сообщением (до 2000 символов). Отмена: /cancel",
    });
  }
  const [, kind, rawPage] = data.split(":");
  const page = Number(rawPage || 0);
  if (!Number.isInteger(page) || page < 0 || page > 100000) return null;
  let rows;
  if (kind === "customers" || kind === "sellers") {
    rows = repo.listUsers(kind === "customers" ? "client" : "seller", page);
    for (const u of rows.slice(0, 5))
      await telegram.send(chatId, { text: accountMessage(u) });
  } else if (kind === "applications") {
    rows = repo.listApplications(page);
    for (const a of rows.slice(0, 5))
      await telegram.send(chatId, {
        text: applicationMessage(a),
        reply_markup:
          a.status === "На проверке" ? applicationKeyboard(a.id) : undefined,
      });
  } else if (kind === "tickets") {
    rows = repo.listTickets(page);
    for (const t of rows.slice(0, 5))
      await telegram.send(chatId, {
        text: ticketMessage(t),
        reply_markup: ticketKeyboard(t.id),
      });
  } else return null;
  return telegram.send(chatId, {
    text: rows.length ? `Страница ${page + 1}` : "Записей пока нет.",
    reply_markup: pagination(kind, page, rows.length > 5),
  });
}

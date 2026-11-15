import {
  accountMessage,
  applicationMessage,
  ticketMessage,
  siteAdminLink,
} from "../utils/formatMessage.js";
import {
  applicationKeyboard,
  ticketKeyboard,
} from "../keyboards/adminKeyboard.js";
export function createNotifications(repo, config) {
  const each = (payload, key) => {
    for (const id of config.adminIds) repo.queue(id, payload, `${key}:${id}`);
  };
  return {
    registration: (user, application) => {
      each(
        {
          text: accountMessage(user),
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🌐 Открыть админ сайта",
                  url: siteAdminLink(
                    config,
                    user.role === "seller" ? "/shops" : "/customers",
                  ),
                },
              ],
            ],
          },
        },
        `registration:${user.id}`,
      );
      if (application)
        each(
          {
            text: applicationMessage(application),
            reply_markup: applicationKeyboard(application.id),
          },
          `application:${application.id}`,
        );
    },
    support: (ticket) =>
      each(
        {
          text: ticketMessage(ticket),
          reply_markup: ticketKeyboard(ticket.id),
        },
        `ticket:${ticket.id}`,
      ),
  };
}
export function createOutboxWorker(repo, telegram) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      for (const row of repo.pendingOutbox()) {
        try {
          await telegram.send(row.chat_id, JSON.parse(row.payload));
          repo.outboxDone(row.id);
        } catch (error) {
          const retry = Math.max(
            2 ** row.attempts * 2000,
            Number(error.retryAfter || 0) * 1000,
          );
          repo.outboxFailed(row.id, row.attempts + 1, Math.min(retry, 3600000));
          console.warn(
            `Telegram notification deferred (code ${Number(error.code) || 0}).`,
          );
        }
      }
    } finally {
      running = false;
    }
  };
}

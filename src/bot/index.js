import { readConfig } from "./config/index.js";
import { openDatabase } from "./database/index.js";
import { createRepository } from "./database/repository.js";
import { createTelegram } from "./services/telegram.js";
import {
  createNotifications,
  createOutboxWorker,
} from "./services/adminNotifications.js";
import { createAuth } from "./services/auth.js";
import { createApiServer } from "./services/httpServer.js";
import { createUpdateHandler } from "./handlers/router.js";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  const config = readConfig();
  const db = openDatabase(config.databasePath);
  if (process.argv.includes("--check")) {
    console.log(
      "Configuration and SQLite schema OK. Telegram was not contacted.",
    );
    db.close();
    return;
  }
  const repo = createRepository(db),
    telegram = createTelegram(config.token),
    notifications = createNotifications(repo, config);
  const auth = createAuth(repo, config, notifications);
  const server = createApiServer({ auth, repo, config });
  const handle = createUpdateHandler({ repo, telegram, config, notifications });
  const flush = createOutboxWorker(repo, telegram);
  // Validate token and switch from webhook to polling without discarding pending updates.
  const me = await telegram.call("getMe");
  await telegram.call("deleteWebhook", { drop_pending_updates: false });
  await telegram.call("setMyCommands", {
    commands: [
      { command: "start", description: "Открыть BakeU" },
      { command: "id", description: "Мой Telegram ID" },
      { command: "cancel", description: "Отменить ввод" },
    ],
  });
  for (const chatId of config.adminIds) {
    try {
      await telegram.call("setMyCommands", {
        scope: { type: "chat", chat_id: chatId },
        commands: [
          { command: "start", description: "Главное меню" },
          { command: "admin", description: "Админ-панель BakeU" },
          { command: "id", description: "Мой Telegram ID" },
          { command: "cancel", description: "Отменить ввод" },
        ],
      });
    } catch {
      console.warn(
        "An admin must open the bot and send /start before receiving notifications.",
      );
    }
  }
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  console.log(
    `BakeU bot @${me.username} started. API: http://${config.host}:${config.port}.`,
  );
  let stopping = false;
  let pollController;
  let flushing = null;
  const timer = setInterval(() => {
    if (flushing) return;
    flushing = flush()
      .catch(() => console.warn("Outbox worker failed; will retry."))
      .finally(() => {
        flushing = null;
      });
  }, 2000);
  const stop = () => {
    stopping = true;
    pollController?.abort();
    clearInterval(timer);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    while (!stopping) {
      try {
        pollController = new AbortController();
        const timeout = setTimeout(() => pollController.abort(), 40000);
        let updates;
        try {
          updates = await telegram.call(
            "getUpdates",
            {
              offset: repo.getOffset(),
              timeout: 25,
              allowed_updates: ["message", "callback_query"],
            },
            pollController.signal,
          );
        } finally {
          clearTimeout(timeout);
        }
        for (const update of updates) {
          if (stopping) break;
          try {
            await handle(update);
          } catch (error) {
            console.warn(
              `Bot update failed (code ${Number(error.code) || 0}).`,
            );
          }
          repo.setOffset(update.update_id + 1);
        }
      } catch (error) {
        if (stopping) break;
        if ([401, 409].includes(error.code)) throw error;
        await delay(
          Math.min(Math.max(Number(error.retryAfter || 0) * 1000, 3000), 60000),
        );
      }
    }
  } finally {
    clearInterval(timer);
    await new Promise((resolve) => server.close(resolve));
    await flushing;
    db.close();
  }
}
main().catch((error) => {
  console.error(
    error.code
      ? `Bot stopped: Telegram error ${Number(error.code)}. Check token or duplicate bot processes.`
      : error.message?.includes("BOT_TOKEN") ||
          error.message?.includes("ADMIN_IDS") ||
          error.message?.includes("API_") ||
          error.message?.includes("ORIGINS") ||
          error.message?.includes("SESSION_") ||
          error.message?.includes("TRUST_PROXY")
        ? error.message
        : "Bot startup failed. Check configuration, network and database permissions.",
  );
  process.exitCode = 1;
});

import { miniAppUrl } from "./utils/formatMessage.js";
import { formatStartupError } from "./utils/startupError.js";
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
import { readOrdersConfig } from './orders/config.js';
import { createOrdersApi } from './orders/api.js';
import { createOrdersIntegration } from './orders/integration.js';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let startupStage = "configuration";
async function main() {
  const config = readConfig(process.env, {
    miniApp: process.argv.includes("--miniapp"),
  });
  const publicSite = new URL(config.siteUrl);
  const ordersSettings = readOrdersConfig(process.env);
  console.log(`Telegram orders: ${ordersSettings.enabled ? "enabled" : "disabled (configure TELEGRAM_ORDERS_ENABLED, GO_BACKEND_URL and TELEGRAM_BRIDGE_TOKEN)"}.`);
  console.log(
    `Launch mode: ${config.useWebApp ? "Telegram Mini App (web_app)" : "Website link (url)"}.`,
  );
  console.log(
    `Public site: ${publicSite.origin}${publicSite.pathname}${config.useWebApp ? "?miniapp=1" : ""}`,
  );
  if (!config.useWebApp)
    console.log(
      "Use npm run bot from the repository root to launch the Mini App.",
    );
  startupStage = "database";
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
  const server = createApiServer({ auth, repo, config, ordersSettings });
  const orders = createOrdersIntegration({settings:ordersSettings,config,telegram});
  const phoneAccounts = ordersSettings.accountsEnabled ? createOrdersApi(ordersSettings) : null;
  const handle = createUpdateHandler({ repo, telegram, config, notifications, auth, orders, phoneAccounts });
  const legacyFlush = createOutboxWorker(repo, telegram);
  const flush = async () => { await legacyFlush(); await orders.flush(); };
  // Validate token and switch from webhook to polling without discarding pending updates.
  startupStage = "telegram";
  const me = await telegram.call("getMe");
  config.botUsername = me.username;
  await telegram.call("deleteWebhook", { drop_pending_updates: false });
  await telegram.call("setMyCommands", {
    commands: [
      { command: "start", description: "Открыть BakeU" },
      { command: "id", description: "Мой Telegram ID" },
      { command: "cancel", description: "Отменить ввод" },
    ],
  });
  await telegram.call("setChatMenuButton", {
    menu_button: config.useWebApp
      ? {
          type: "web_app",
          text: "BakeU · Магазин",
          web_app: { url: miniAppUrl(config) },
        }
      : { type: "commands" },
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
  startupStage = "api";
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
  startupStage = "polling";
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
        if (stopping) break;if (error.code === 401) throw error;

if (error.code === 409) {
  await delay(15000);
  continue;
}
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
  console.error(formatStartupError(error, startupStage));
  process.exitCode = 1;
});

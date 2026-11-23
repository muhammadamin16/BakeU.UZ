import { ConfigError } from "../config/index.js";
import { TelegramError } from "../services/telegram.js";
import { SQLitePermissionError } from "../database/permissions.js";

// Deliberately do not print raw error.message, cause, stack or request URLs.
export function formatStartupError(error, stage = "startup") {
  if (error instanceof SQLitePermissionError) return error.message;
  if (error instanceof ConfigError)
    return `Configuration error: ${error.message}`;
  if (error instanceof TelegramError) {
    const method = [
      "getMe",
      "deleteWebhook",
      "setMyCommands",
      "getUpdates",
    ].includes(error.method)
      ? ` (${error.method})`
      : "";
    if (error.code === 0) {
      const code = error.networkCode || "NETWORK_ERROR";
      const hint = ["ENOTFOUND", "EAI_AGAIN"].includes(code)
        ? "DNS cannot resolve api.telegram.org. Check your internet/DNS."
        : /CERT|SIGNATURE/.test(code)
          ? "TLS certificate check failed. Check the system clock and trusted certificates; do not disable TLS verification."
          : "Cannot connect to api.telegram.org. Check internet access, firewall, proxy or Telegram availability on this network.";
      return `Telegram network error${method}: ${code}. ${hint}`;
    }
    if ([401, 404].includes(error.code))
      return `Telegram rejected BOT_TOKEN${method} (HTTP ${error.code}). Check the token in src/bot/.env; never share it.`;
    if (error.code === 409)
      return "Telegram conflict (409): another process is using this bot token. Stop the other bot instance.";
    if (error.code === 429)
      return `Telegram rate limit${method} (429). Wait ${Number(error.retryAfter) || 30} seconds, then retry.`;
    return `Telegram API error${method}: HTTP ${Number(error.code) || "unknown"}. Check bot configuration and Telegram availability.`;
  }
  if (error?.code === "EADDRINUSE")
    return "API port is already in use. Stop the previous bot/server or change API_PORT (and your frontend proxy) before retrying.";
  if (stage === "database")
    return "SQLite database could not be opened. Check DATABASE_PATH and write access to its parent directory, database, -wal and -shm files. Preserve the existing volume and database.";
  if (["EACCES", "EPERM"].includes(error?.code))
    return "Permission denied. Check access to src/bot/data and the configured API port.";
  const label =
    {
      configuration: "configuration",
      telegram: "Telegram connection",
      api: "API server",
      polling: "Telegram polling",
    }[stage] || "startup";
  return `Bot failed during ${label}. Run npm run bot:check and check Node.js 24+, configuration and local permissions.`;
}

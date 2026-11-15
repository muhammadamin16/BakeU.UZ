import { DEFAULT_MINI_APP_URL } from "./public.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export class ConfigError extends Error {}

export function readConfig(env = process.env, { miniApp = false } = {}) {
  const token = (env.BOT_TOKEN || "").trim();
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token))
    throw new ConfigError(
      "BOT_TOKEN is missing or invalid. Fill src/bot/.env.",
    );
  const adminIds = [
    ...new Set(
      (env.ADMIN_IDS || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
  if (!adminIds.length || adminIds.some((x) => !/^\d{1,20}$/.test(x)))
    throw new ConfigError("ADMIN_IDS must contain numeric Telegram user IDs.");
  function url(key, fallback = "") {
    const raw = String(env[key] || "").trim() || fallback;
    if (!raw) return "";
    let u;
    try {
      u = new URL(raw);
    } catch {
      throw new ConfigError(`${key} must be a full HTTP(S) URL.`);
    }
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      throw new ConfigError(
        `${key} must be an HTTP(S) URL without credentials.`,
      );
    return u.href;
  }
  // The explicit Mini App launcher is independent of legacy SITE_URL / USE_WEB_APP.
  // MINI_APP_URL is an optional override for a future public deployment.
  const siteUrl = url(
    miniApp ? "MINI_APP_URL" : "SITE_URL",
    DEFAULT_MINI_APP_URL,
  );
  if (!siteUrl)
    throw new ConfigError("SITE_URL / MINI_APP_URL must not be blank.");
  if (miniApp && !siteUrl.startsWith("https://"))
    throw new ConfigError("MINI_APP_URL must use HTTPS for Telegram Mini App.");
  const origins = (env.ALLOWED_ORIGINS || new URL(siteUrl).origin)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new ConfigError("Invalid ALLOWED_ORIGINS.");
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    )
      throw new ConfigError(
        "ALLOWED_ORIGINS must contain exact origins without paths or trailing slashes.",
      );
  }
  if (miniApp && !origins.includes(new URL(siteUrl).origin))
    origins.push(new URL(siteUrl).origin);
  const port = Number(env.API_PORT || 3001),
    sessionHours = Number(env.SESSION_HOURS || 24);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new ConfigError("API_PORT must be 1–65535.");
  if (!Number.isInteger(sessionHours) || sessionHours < 1 || sessionHours > 720)
    throw new ConfigError("SESSION_HOURS must be 1–720.");
  const host = env.API_HOST || "127.0.0.1",
    trustProxy = env.TRUST_PROXY === "true";
  if (trustProxy && !["127.0.0.1", "::1"].includes(host))
    throw new ConfigError("TRUST_PROXY requires a loopback API_HOST.");
  const supportEmail = (env.SUPPORT_EMAIL || "").trim();
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail))
    throw new ConfigError("SUPPORT_EMAIL is invalid.");
  const base = fileURLToPath(new URL("../", import.meta.url));
  return {
    token,
    adminIds,
    siteUrl,
    telegramUrl: url("TELEGRAM_URL"),
    instagramUrl: url("INSTAGRAM_URL"),
    supportEmail,
    useWebApp:
      (miniApp || env.USE_WEB_APP?.trim().toLowerCase() === "true") &&
      siteUrl.startsWith("https://"),
    origins,
    host,
    port,
    trustProxy,
    sessionHours,
    databasePath: resolve(base, env.DATABASE_PATH || "./data/bakeu.sqlite"),
  };
}

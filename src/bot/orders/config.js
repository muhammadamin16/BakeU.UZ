export function readOrdersConfig(env = process.env) {
  const enabled = env.TELEGRAM_ORDERS_ENABLED === "true";
  const accountsEnabled = env.GO_ACCOUNTS_ENABLED === "true";
  if (!enabled && !accountsEnabled) return { enabled: false };
  let url;
  try {
    url = new URL(env.GO_BACKEND_URL);
  } catch {
    throw new Error("GO_BACKEND_URL is required for Telegram orders.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (!["https:"].includes(url.protocol) &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error("GO_BACKEND_URL must use HTTPS (HTTP only on loopback).");
  if (
    !/^\S{32,}$/.test(env.TELEGRAM_BRIDGE_TOKEN || "") ||
    env.TELEGRAM_BRIDGE_TOKEN === env.BOT_TOKEN
  )
    throw new Error(
      "TELEGRAM_BRIDGE_TOKEN must be a separate service credential of at least 32 characters.",
    );
  return {
    enabled,
    accountsEnabled,
    baseUrl: url.href.replace(/\/$/, "").replace(/\/api$/, ""),
    token: env.TELEGRAM_BRIDGE_TOKEN,
  };
}

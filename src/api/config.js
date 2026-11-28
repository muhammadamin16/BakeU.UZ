// Public browser configuration only. Service tokens and database URLs belong
// to the separate Backend/Bot services, never to VITE_* variables.
export function publicApiURL(value, label) {
  const result = String(value ?? "/api").trim().replace(/\/$/, "");
  if (!result || result === "/api") return result;
  let url;
  try { url = new URL(result); } catch { throw Error(`${label} must be /api or an HTTPS API URL.`); }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.hostname.endsWith(".railway.internal") ||
      !(url.protocol === "https:" || url.protocol === "http:" && loopback)) {
    throw Error(`${label} must not contain credentials, private hosts or query parameters.`);
  }
  return result;
}

export function readPublicConfig(env = {}) {
  // Older deployments may still supply these public names during the move.
  // The client is independent of the Backend implementation language.
  const api = publicApiURL(env.VITE_API_URL ?? env.VITE_GO_API_URL ?? "/api", "VITE_API_URL");
  const miniAppAPI = publicApiURL(env.VITE_MINIAPP_API_URL ?? env.VITE_ACCOUNT_API_URL ?? "/api", "VITE_MINIAPP_API_URL");
  const flag = env.VITE_PHONE_ACCOUNTS ?? env.VITE_GO_PHONE_ACCOUNTS ?? "true";
  if (!["true", "false"].includes(flag)) throw Error("VITE_PHONE_ACCOUNTS must be true or false.");
  if (flag === "true" && !api) throw Error("Phone accounts require VITE_API_URL.");
  return { api, miniAppAPI, phoneAccounts: flag === "true" };
}

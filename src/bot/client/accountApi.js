// Browser-safe adapter. No bot token or admin IDs are ever bundled with Vite.
const base = (import.meta.env.VITE_ACCOUNT_API_URL || "").replace(/\/$/, "");
export const accountApiEnabled = Boolean(base);
const TOKEN_KEY = "bakeu-server-session-v1";
function cache(result) {
  let records;
  try {
    records = JSON.parse(localStorage.getItem("bakeu-accounts-v2") || "{}");
  } catch {
    records = {};
  }
  if (!records || typeof records !== "object" || Array.isArray(records))
    records = {};
  records[result.user.id] = { profile: result.user, server: true };
  localStorage.setItem("bakeu-accounts-v2", JSON.stringify(records));
  sessionStorage.setItem("bakeu-demo-profile", JSON.stringify(result.user));
  if (result.token) sessionStorage.setItem(TOKEN_KEY, result.token);
  return result.user;
}
async function request(path, method = "GET", body) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Error(
      "Сервер BakeU недоступен. Проверьте подключение и попробуйте снова.",
    );
  }
  const responseType = response.headers.get("content-type") || "";
  if (!responseType.includes("application/json")) {
    throw Error(
      response.ok
        ? "API BakeU настроен неправильно: вместо JSON пришла страница сайта. Проверьте VITE_ACCOUNT_API_URL и proxy /api."
        : `API BakeU недоступен (HTTP ${response.status}). Проверьте, что запросы /api идут к Telegram-боту, а не к сайту или Go Backend.`,
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error("Сервер вернул повреждённый JSON. Проверьте логи BakeU Bot API.");
  }
  if (!response.ok) throw Error(result.error || `Ошибка сервера (HTTP ${response.status}).`);
  return result;
}
export async function registerServer(form, role) {
  const result = await request("/auth/register", "POST", { ...form, role });
  return cache(result);
}
export async function loginServer(phone, password) {
  const result = await request("/auth/login", "POST", { phone, password });
  return cache(result);
}
export async function saveServerProfile(profile) {
  const result = await request("/auth/me", "PATCH", profile);
  return cache(result);
}
export async function getServerProfile() {
  return request("/auth/me");
}
export async function logoutServer() {
  const pending =
    accountApiEnabled && sessionStorage.getItem(TOKEN_KEY)
      ? request("/auth/logout", "POST", {})
      : Promise.resolve();
  sessionStorage.removeItem(TOKEN_KEY);
  return pending;
}

export async function startTelegramRegistration(form, role) {
  return request("/auth/start-registration", "POST", { ...form, role });
}
export async function verifyTelegramRegistration(token, code) {
  const result = await request("/auth/verify-registration", "POST", { token, code });
  return cache(result);
}

export async function startTelegramLogin(phone) {
  return request("/auth/start-login", "POST", { phone });
}
export async function verifyTelegramLogin(token, code) {
  const result = await request("/auth/verify-login", "POST", { token, code });
  return cache(result);
}

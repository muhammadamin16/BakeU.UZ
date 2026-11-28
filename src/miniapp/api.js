import { miniLaunch } from "./telegram";
import { accountAPI, phoneAccountsEnabled, frontendOnly } from "../api/account.js";
import { createMiniAccountSession } from "./accountSession.js";
import { readPublicConfig } from "../api/config.js";
const base = readPublicConfig(import.meta.env).miniAppAPI;
const KEY = "bakeu-miniapp-session-v1";
let memoryToken = "";
let pending;
let launchVerified = false;
function getToken() {
  try {
    return sessionStorage.getItem(KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}
function setToken(token) {
  memoryToken = token;
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* In-memory sessions still work. */
  }
}
export async function miniRequest(
  path,
  { method = "GET", body, token = getToken() } = {},
) {
  if (frontendOnly) throw Error("Frontend preview: Telegram verification will be connected with Backend.");
  let response;
  try {
    response = await fetch(`${base}/miniapp${path}`, {
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
      "Serverga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("Server javobi noto‘g‘ri. Bot va sayt serverini tekshiring.");
  }
  if (!response.ok) {
    const error = Error(data.error || "So‘rov bajarilmadi.");
    error.status = response.status;
    throw error;
  }
  return data;
}
async function verify() {
  // A fresh signed launch must replace any session left by another Telegram account.
  if (miniLaunch.initData && !launchVerified) setToken("");
  if (getToken()) {
    try {
      return await miniRequest("/me");
    } catch (error) {
      if (error.status !== 401) throw error;
      setToken("");
    }
  }
  if (!miniLaunch.initData) return null;
  const result = await miniRequest("/session", {
    method: "POST",
    body: { initData: miniLaunch.initData },
    token: "",
  });
  setToken(result.token);
  launchVerified = true;
  return {
    user: result.user,
    isAdmin: result.isAdmin,
    links: result.links,
    expiresAt: result.expiresAt,
  };
}
const accountMini = createMiniAccountSession({
  accountAPI,
  openLaunch: (initData) => miniRequest("/go-session", { method: "POST", body: { initData }, token: "" }),
  setAdminToken: setToken,
});
export function authenticateMiniApp(options) {
  if (frontendOnly) return Promise.resolve(null);
  if (!pending)
    pending = (phoneAccountsEnabled ? accountMini.authenticate(miniLaunch.initData, options) : verify()).finally(() => {
      pending = null;
    });
  return pending;
}

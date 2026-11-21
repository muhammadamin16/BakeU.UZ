import { createGoSession } from "./goSession.js";

export const goAPIBase = (import.meta.env.VITE_GO_API_URL || "").trim().replace(/\/$/, "");
export const serverStorefrontEnabled = Boolean(goAPIBase);
export const goAccount = serverStorefrontEnabled ? createGoSession(goAPIBase) : null;
// Coordinated opt-in: enable only after the Go phone API and bot are deployed.
export const goPhoneAccountsEnabled = import.meta.env.VITE_GO_PHONE_ACCOUNTS === "true";

export function productImageURL(path) {
  if (typeof path !== "string" || !/^\/api\/images\/[a-f0-9]{24}$/i.test(path)) return "";
  return goAPIBase.replace(/\/api$/, "") + path;
}

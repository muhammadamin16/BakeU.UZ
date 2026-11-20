import { createGoSession } from "./goSession.js";

export const goAPIBase = (import.meta.env.VITE_GO_API_URL || "").trim().replace(/\/$/, "");
export const serverStorefrontEnabled = Boolean(goAPIBase);
export const goAccount = serverStorefrontEnabled ? createGoSession(goAPIBase) : null;

export function productImageURL(path) {
  if (typeof path !== "string" || !/^\/api\/images\/[a-f0-9]{24}$/i.test(path)) return "";
  return goAPIBase.replace(/\/api$/, "") + path;
}

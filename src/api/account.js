import { createAccountSession } from "./session.js";
import { readPublicConfig } from "./config.js";

const config = readPublicConfig(import.meta.env);
export const apiBaseURL = config.api;
export const serverAccountsEnabled = Boolean(apiBaseURL);
export const phoneAccountsEnabled = config.phoneAccounts;
// Kept for the older presentation branch; local credential bypasses are absent.
export const localAccountsEnabled = false;
export const accountAPI = serverAccountsEnabled ? createAccountSession(apiBaseURL) : null;

export function productImageURL(path) {
  if (typeof path !== "string" || !/^\/api\/images\/[a-f0-9]{24}$/i.test(path)) return "";
  return apiBaseURL.replace(/\/api$/, "") + path;
}

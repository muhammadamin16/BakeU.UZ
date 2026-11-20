import { createGoSession } from "./goSession.js";

const base = (import.meta.env.VITE_GO_API_URL || "").trim().replace(/\/$/, "");
export const serverStorefrontEnabled = Boolean(base);
export const goAccount = serverStorefrontEnabled ? createGoSession(base) : null;

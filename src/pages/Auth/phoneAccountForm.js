import { completeUzPhone } from "./uzPhone.js";

const text = (value) => String(value || "").trim();
const validText = (value, min, max) => [...value].length >= min && [...value].length <= max && !/[\0\r\n]/.test(value);
const pendingKey = (purpose) => `bakeu-go-phone-${purpose}-v2`;

// Whitelist the public contract. Credentials, identity/verification claims and
// seller-only fields on customer/login requests never leave the browser here.
export function phoneStartPayload(draft, register) {
  const phone = register ? completeUzPhone(draft.phone) : text(draft.phone);
  if (!phone) throw Error("Введите номер в формате +998 XX XXX XX XX.");
  const body = { purpose: register ? "register" : "login", phone };
  if (!register) return body;
  const firstName = text(draft.firstName), lastName = text(draft.lastName);
  if (!["customer", "seller"].includes(draft.role) || !validText(firstName, 1, 80) || !validText(lastName, 1, 80)) {
    throw Error("Укажите имя, фамилию и тип аккаунта.");
  }
  Object.assign(body, { firstName, lastName, role: draft.role });
  if (draft.role === "seller") {
    const marketName = text(draft.marketName), address = text(draft.address);
    if (!validText(marketName, 2, 150) || !validText(address, 3, 250)) throw Error("Укажите название магазина и подробный адрес.");
    if (!Number.isFinite(draft.lat) || !Number.isFinite(draft.lng) || Math.abs(draft.lat) > 90 || Math.abs(draft.lng) > 180) throw Error("Выберите точку магазина на карте.");
    Object.assign(body, { marketName, address, lat: draft.lat, lng: draft.lng });
  }
  return body;
}

export function validPhoneChallenge(pending, now = Date.now()) {
  if (!/^[a-f0-9]{48}$/.test(pending?.id || "") || !Number.isFinite(Date.parse(pending?.expiresAt)) || Date.parse(pending.expiresAt) <= now) return false;
  try {
    const url = new URL(pending.telegramUrl);
    return url.origin === "https://t.me" && !url.username && !url.password && !url.hash && /^\/[A-Za-z0-9_]{5,32}$/.test(url.pathname) &&
      url.searchParams.size === 1 && url.searchParams.get("start") === `goauth_${pending.id}`;
  } catch { return false; }
}
export function savePhonePending(purpose, pending, storage) {
  if (!validPhoneChallenge(pending)) throw Error("Сервер вернул неверную ссылку подтверждения.");
  const value = { id: pending.id, expiresAt: pending.expiresAt, telegramUrl: pending.telegramUrl };
  try { (storage ?? globalThis.sessionStorage)?.setItem(pendingKey(purpose), JSON.stringify(value)); } catch { /* In-memory verification still works. */ }
  return value;
}
export function clearPhonePending(purpose, storage) {
  try { (storage ?? globalThis.sessionStorage)?.removeItem(pendingKey(purpose)); } catch { /* No persistent credentials. */ }
}
export function readPhonePending(purpose, storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.sessionStorage)?.getItem(pendingKey(purpose)) || "null");
    if (validPhoneChallenge(value)) return value;
  } catch { /* Malformed/expired pending proof is never an account. */ }
  clearPhonePending(purpose, storage);
  return null;
}

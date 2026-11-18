import { normalizeSearch } from "./alphabet.js";

// Russian source text is its own fallback; ru.json contains only nonidentity overrides.
import ru from "../locales/ru.json" with { type: "json" };
import uz from "../locales/uz.json" with { type: "json" };
import templates from "./templates.json" with { type: "json" };

const STORAGE_KEY = "bakeu:language";
const listeners = new Set();
export function readLanguage(storage) {
  try {
    return storage?.getItem(STORAGE_KEY) === "uz" ? "uz" : "ru";
  } catch {
    return "ru";
  }
}
function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
let language = readLanguage(browserStorage());
export const getLanguage = () => language;
export const subscribeLanguage = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function applyLanguage(next) {
  if (typeof document !== "undefined") document.documentElement.lang = next;
  if (next === language) return;
  language = next;
  listeners.forEach((listener) => listener());
}
export function setLanguage(next) {
  if (!["uz", "ru"].includes(next)) return;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* Language switching still works when browser storage is unavailable. */
  }
  applyLanguage(next);
}
if (typeof window !== "undefined") {
  applyLanguage(language);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      applyLanguage(readLanguage(browserStorage()));
    }
  });
}
export const getLocale = () => (language === "uz" ? "uz-UZ" : "ru-RU");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = templates.map((parts) => ({
  parts,
  expression: new RegExp("^" + parts.map(escape).join("([\\s\\S]*?)") + "$"),
}));
function translateString(value, locale, depth = 0) {
  const dictionary = locale === "uz" ? uz : ru;
  if (Object.hasOwn(dictionary, value)) return dictionary[value];
  const trimmed = value.trim();
  if (Object.hasOwn(dictionary, trimmed))
    return value.replace(trimmed, () => dictionary[trimmed]);
  if (!/[А-Яа-яЁё]/.test(value) || depth > 3) return value;
  for (const { parts, expression } of patterns) {
    const match = value.match(expression);
    if (match)
      return parts
        .map(
          (part, index) =>
            (dictionary[part] ?? part) +
            (index < parts.length - 1
              ? translateString(match[index + 1], locale, depth + 1)
              : ""),
        )
        .join("");
  }
  if (value.includes("\n"))
    return value
      .split("\n")
      .map((line) => translateString(line, locale, depth + 1))
      .join("\n");
  return value;
}
// Translate display values only. Store IDs, filter values, inputs and user messages
// retain their original values; React elements are passed through untouched.
export function translateText(value, locale = language) {
  if (typeof value === "string") return translateString(value, locale);
  if (Array.isArray(value))
    return value.map((item) => translateText(item, locale));
  return value;
}

export function matchesLocalizedSearch(query, ...values) {
  return values.some((value) =>
    [value, translateText(value, "uz"), translateText(value, "ru")].some(
      (text) => normalizeSearch(text).includes(query),
    ),
  );
}

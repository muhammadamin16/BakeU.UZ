// src/store/aiHistory.js
// История чатов с помощником BakeU хранится в localStorage этого браузера.

const STORAGE_KEY = "bakeu-ai-history";
const MAX_CHATS = 30;
const MAX_MESSAGES = 200;

export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isValidChat(chat) {
  return (
    chat &&
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    Array.isArray(chat.messages)
  );
}

export function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidChat) : [];
  } catch {
    return [];
  }
}

export function saveChats(chats) {
  try {
    const trimmed = [...chats]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CHATS)
      .map((chat) => ({
        ...chat,
        messages: chat.messages.slice(-MAX_MESSAGES),
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage недоступен или переполнен: история просто не сохранится */
  }
}

export function makeTitle(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42).trimEnd()}…` : clean;
}

/** Группировка по дате: Сегодня / Вчера / Ранее. */
export function groupChats(chats, now = Date.now()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const day = 24 * 60 * 60 * 1000;

  const groups = [
    { label: "Сегодня", items: [] },
    { label: "Вчера", items: [] },
    { label: "Ранее", items: [] },
  ];

  [...chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((chat) => {
      if (chat.updatedAt >= today) groups[0].items.push(chat);
      else if (chat.updatedAt >= today - day) groups[1].items.push(chat);
      else groups[2].items.push(chat);
    });

  return groups.filter((group) => group.items.length > 0);
}
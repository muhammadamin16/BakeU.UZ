import { useSyncExternalStore } from "react";

const KEY = "bakeu-chat-v1";
const MAX_MESSAGES = 500;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.messages)) return parsed;
  } catch {
    /* ignore */
  }
  return { messages: [] };
}

let state = load();
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

function commit(next) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emit();
}

// Бошқа вкладкада ёзилган хабарлар шу ерда ҳам кўринади
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) {
      state = load();
      emit();
    }
  });
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useChatMessages() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).messages;
}

export const getMessages = () => state.messages;

export function sendMessage({ shopId, from, text }) {
  const clean = String(text).trim();
  if (!clean) return;

  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    shopId,
    from, // "buyer" | "seller"
    text: clean.slice(0, 2000),
    at: Date.now(),
    read: false,
  };

  commit({ ...state, messages: [...state.messages, message].slice(-MAX_MESSAGES) });
}

export function markRead({ shopId, reader }) {
  let changed = false;

  const messages = state.messages.map((m) => {
    if (m.shopId === shopId && m.from !== reader && !m.read) {
      changed = true;
      return { ...m, read: true };
    }
    return m;
  });

  if (changed) commit({ ...state, messages });
}
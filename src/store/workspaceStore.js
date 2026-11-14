import { create } from "zustand";
import { accountId } from "./localAccount";
const KEY = "bakeu-workspace-v2";
const empty = {
  threads: [],
  orders: [],
  reviews: [],
  follows: [],
  autoReplies: {},
};
function read() {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...empty };
  }
}
export const useWorkspace = create(() => read());
function commit(patch) {
  const next = { ...useWorkspace.getState(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  useWorkspace.setState(next, true);
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) useWorkspace.setState(read(), true);
  });
const uid = () => crypto.randomUUID();
export function followShop(account, shopId) {
  const s = useWorkspace.getState(),
    buyerId = accountId(account);
  const found = s.follows.some(
    (f) => f.buyerId === buyerId && f.shopId === shopId,
  );
  commit({
    follows: found
      ? s.follows.filter((f) => !(f.buyerId === buyerId && f.shopId === shopId))
      : [...s.follows, { buyerId, shopId, name: account.firstName }],
  });
}
export function startThread(account, shop) {
  const buyerId = accountId(account);
  const s = useWorkspace.getState();
  const old = s.threads.find(
    (t) => t.buyerId === buyerId && t.shopId === shop.id,
  );
  if (old) return old.id;
  const t = {
    id: uid(),
    buyerId,
    buyerName: account.firstName,
    shopId: shop.id,
    shopName: shop.name,
    messages: [],
  };
  commit({ threads: [t, ...s.threads] });
  return t.id;
}
export function postMessage(account, ownerId, threadId, text) {
  const clean = text.trim();
  if (!clean) return;
  const s = useWorkspace.getState(),
    t = s.threads.find((t) => t.id === threadId);
  if (!t) throw Error("Чат не найден");
  const seller = account.role === "seller";
  if (seller ? t.shopId !== ownerId : t.buyerId !== accountId(account))
    throw Error("Этот чат недоступен");
  const from = seller ? "seller" : "buyer";
  const messages = [
    ...t.messages,
    {
      id: uid(),
      text: clean.slice(0, 2000),
      from,
      at: Date.now(),
      read: false,
    },
  ];
  const config = s.autoReplies[t.shopId];
  if (
    !seller &&
    t.messages.every((m) => m.from !== "buyer") &&
    config?.enabled !== false
  ) {
    messages.push({
      id: uid(),
      text:
        config?.text ||
        "Здравствуйте! Спасибо за сообщение. Укажите товар, дату и количество — продавец сможет уточнить детали.",
      from: "auto",
      at: Date.now(),
      read: false,
    });
  }
  commit({
    threads: s.threads.map((x) => (x.id === t.id ? { ...x, messages } : x)),
  });
}
export function markThreadRead(account, ownerId, id) {
  const s = useWorkspace.getState(),
    t = s.threads.find((t) => t.id === id);
  if (
    !t ||
    (account.role === "seller"
      ? t.shopId !== ownerId
      : t.buyerId !== accountId(account))
  )
    return;
  const own = account.role === "seller" ? "seller" : "buyer";
  if (!t.messages.some((m) => m.from !== own && !m.read)) return;
  commit({
    threads: s.threads.map((x) =>
      x.id === id
        ? {
            ...x,
            messages: x.messages.map((m) =>
              m.from !== own ? { ...m, read: true } : m,
            ),
          }
        : x,
    ),
  });
}
export function setAutoReply(shopId, enabled, text) {
  commit({
    autoReplies: {
      ...useWorkspace.getState().autoReplies,
      [shopId]: { enabled, text: text.trim().slice(0, 1000) },
    },
  });
}
export function createOrder(account, lines, address) {
  if (account.role !== "client" || !address.trim() || !lines.length)
    throw Error("Укажите адрес и товары.");
  const groups = {};
  for (const l of lines) {
    if (
      !l.shopId ||
      !Number.isFinite(l.price) ||
      l.price <= 0 ||
      !Number.isInteger(l.quantity) ||
      l.quantity < 1
    )
      throw Error("Проверьте товары.");
    (groups[l.shopId] ??= []).push(l);
  }
  const orders = Object.entries(groups).map(([shopId, items]) => ({
    id: uid(),
    buyerId: accountId(account),
    buyerName: account.firstName,
    shopId,
    items,
    address: address.trim(),
    status: "Новый",
    at: Date.now(),
    total: items.reduce((n, p) => n + p.price * p.quantity, 0),
  }));
  commit({ orders: [...orders, ...useWorkspace.getState().orders] });
}
export function updateOrder(ownerId, id, status) {
  const s = useWorkspace.getState(),
    o = s.orders.find((o) => o.id === id);
  const next = {
    Новый: ["Готовится", "Отменён"],
    Готовится: ["Доставка", "Выполнен", "Отменён"],
    Доставка: ["Выполнен"],
  };
  if (!o || o.shopId !== ownerId || !next[o.status]?.includes(status))
    throw Error("Недопустимый статус");
  commit({ orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) });
}
export function addReview(account, orderId, rating, text) {
  const s = useWorkspace.getState(),
    o = s.orders.find((o) => o.id === orderId);
  if (
    !o ||
    o.buyerId !== accountId(account) ||
    o.status !== "Выполнен" ||
    s.reviews.some((r) => r.orderId === orderId) ||
    !text.trim()
  )
    throw Error("Отзыв доступен один раз после выполнения заказа.");
  commit({
    reviews: [
      ...s.reviews,
      {
        id: uid(),
        orderId,
        shopId: o.shopId,
        buyerId: o.buyerId,
        author: account.firstName,
        rating: Math.max(1, Math.min(5, Number(rating))),
        text: text.trim(),
        at: Date.now(),
        reply: "",
      },
    ],
  });
}
export function replyReview(ownerId, id, text) {
  const s = useWorkspace.getState();
  commit({
    reviews: s.reviews.map((r) =>
      r.id === id && r.shopId === ownerId ? { ...r, reply: text.trim() } : r,
    ),
  });
}

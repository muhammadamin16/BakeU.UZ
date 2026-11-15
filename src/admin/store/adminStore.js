import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mergeAdminState } from "../utils/accounts";
import {
  normalizeManagement,
  saveManagedRecord,
  removeManagedRecord,
  changeAccountStatus,
  changeSubscription,
  decideApplication,
} from "../utils/management";
const seed = {
  customers: [
    {
      id: "U101",
      name: "Дильноза Ахмедова",
      phone: "+998 90 123 45 67",
      email: "dilnoza@example.com",
      status: "Активен",
      date: "2026-11-15",
    },
    {
      id: "U102",
      name: "Умид Каримов",
      phone: "+998 91 234 56 78",
      email: "umid@example.com",
      status: "Активен",
      date: "2026-11-14",
    },
  ],
  shops: [
    {
      id: "S101",
      name: "Сладкий дом",
      owner: "Алия Каримова",
      phone: "+998 90 111 22 33",
      address: "Ташкент, Чиланзар",
      status: "Открыт",
      plan: "BakeU Pro",
    },
    {
      id: "S102",
      name: "Домашняя пекарня",
      owner: "Нодира Рахимова",
      phone: "+998 91 222 33 44",
      address: "Ташкент, Юнусабад",
      status: "Открыт",
      plan: "BakeU Pro",
    },
  ],
  applications: [
    {
      id: "A101",
      name: "Шахзода Ибрагимова",
      shop: "Вкусные десерты",
      phone: "+998 90 333 44 55",
      date: "2026-11-15",
      status: "На проверке",
    },
    {
      id: "A102",
      name: "Отабек Салимов",
      shop: "Домашняя выпечка",
      phone: "+998 91 444 55 66",
      date: "2026-11-14",
      status: "На проверке",
    },
  ],
  products: [
    {
      id: "P101",
      name: "Шоколадный торт",
      shop: "Сладкий дом",
      price: 180000,
      category: "Торты",
      image: "/images/products/cake.jpg",
      description: "Шоколадный торт с клубникой и шоколадным декором.",
      status: "Опубликован",
    },
    {
      id: "P102",
      name: "Домашняя самса",
      shop: "Домашняя пекарня",
      price: 12000,
      category: "Выпечка",
      image: "/images/products/somsa.jpg",
      description: "Домашняя самса с румяной корочкой.",
      status: "Опубликован",
    },
    {
      id: "P103",
      name: "Овсяное печенье",
      shop: "Сладкий дом",
      price: 35000,
      category: "Печенье",
      image: "/images/products/cookie.jpg",
      description: "Овсяное печенье для домашнего чаепития.",
      status: "На проверке",
    },
  ],
  orders: [
    {
      id: "O101",
      customer: "Дильноза Ахмедова",
      shop: "Сладкий дом",
      total: 180000,
      items: [
        {
          productId: "P101",
          name: "Шоколадный торт",
          image: "/images/products/cake.jpg",
          quantity: 1,
          unitPrice: 180000,
          shopId: "S101",
        },
      ],
      date: "2026-11-15",
      status: "Новый",
    },
    {
      id: "O102",
      customer: "Умид Каримов",
      shop: "Домашняя пекарня",
      total: 72000,
      items: [
        {
          productId: "P102",
          name: "Домашняя самса",
          image: "/images/products/somsa.jpg",
          quantity: 6,
          unitPrice: 12000,
          shopId: "S102",
        },
      ],
      date: "2026-11-14",
      status: "В работе",
    },
  ],
  subscriptions: [
    {
      id: "B101",
      name: "Алия Каримова",
      shop: "Сладкий дом",
      plan: "BakeU Pro",
      paid: 99000,
      until: "2026-12-15",
      status: "Активна",
    },
    {
      id: "B102",
      name: "Нодира Рахимова",
      shop: "Домашняя пекарня",
      plan: "BakeU Pro",
      paid: 99000,
      until: "2026-11-20",
      status: "Скоро истекает",
    },
  ],
  notifications: [
    {
      id: "N101",
      title: "Новая заявка",
      text: "Получена заявка на открытие магазина «Вкусные десерты»",
      time: "Сегодня, 14:32",
      read: false,
    },
    {
      id: "N102",
      title: "Оплачена подписка",
      text: "Продавец «Сладкий дом» продлил подписку BakeU Pro на 1 месяц",
      time: "Сегодня, 12:07",
      read: false,
    },
    {
      id: "N103",
      title: "Магазин открыт",
      text: "Магазин «Домашняя пекарня» одобрен и открыт",
      time: "Вчера, 18:20",
      read: true,
    },
    {
      id: "N104",
      title: "Новый покупатель",
      text: "Зарегистрировалась Дильноза Ахмедова",
      time: "Вчера, 11:05",
      read: false,
    },
  ],
  settings: {
    name: "Администратор",
    email: "admin@bakeu.uz",
    site: "BakeU",
    notifications: true,
  },
};
export const useAdminStore = create(
  persist(
    (set, get) => {
      // Check persistence before replacing the in-memory state. A quota/storage
      // error is reported by the form and cannot masquerade as a saved change.
      const commit = (update) => {
        const current = get();
        const next =
          typeof update === "function"
            ? update(current)
            : { ...current, ...update };
        if (next === current) return;
        try {
          localStorage.setItem(
            "bakeu-admin-demo-v1",
            JSON.stringify({ state: next, version: 0 }),
          );
        } catch {
          throw Error(
            "Не удалось сохранить изменения в браузере. Освободите место или разрешите локальное хранилище.",
          );
        }
        set(next);
      };
      return {
        ...normalizeManagement(structuredClone(seed)),
        save: (key, item) =>
          commit((state) => saveManagedRecord(state, key, item)),
        remove: (key, id) =>
          commit((state) => removeManagedRecord(state, key, id)),
        freezeAccount: (key, id, reason) =>
          commit((state) =>
            changeAccountStatus(state, key, id, "Заморожен", reason),
          ),
        thawAccount: (key, id) =>
          commit((state) =>
            changeAccountStatus(
              state,
              key,
              id,
              "Активен",
              "Разморожен администратором",
            ),
          ),
        manageSubscription: (id, action, reason) =>
          commit((state) => changeSubscription(state, id, action, reason)),
        markRead: (id) =>
          commit((state) => ({
            ...state,
            notifications: state.notifications.map((row) =>
              !id || row.id === id ? { ...row, read: true } : row,
            ),
          })),
        saveSettings: (settings) =>
          commit((state) => {
            const next = { ...state, settings };
            const changed = ["name", "email", "site", "notifications"].filter(
              (key) => settings[key] !== state.settings[key],
            );
            if (!changed.length) return state;
            return {
              ...next,
              history: [
                {
                  id: crypto.randomUUID(),
                  at: new Date().toISOString(),
                  actor: state.settings.name,
                  action: "Настройки изменены",
                  entity: "settings",
                  entityId: "admin",
                  label: "Настройки панели",
                  changes: changed.map((key) => ({
                    field: key,
                    before: String(state.settings[key]),
                    after: String(settings[key]),
                  })),
                },
                ...state.history,
              ],
            };
          }),
        decide: (id, status, reason) =>
          commit((state) =>
            decideApplication(state, id, status, Date.now(), reason),
          ),
        refreshSubscriptions: () =>
          commit((state) => {
            const next = normalizeManagement(state);
            return next.subscriptions.some(
              (row, index) => row.status !== state.subscriptions[index].status,
            )
              ? next
              : state;
          }),
      };
    },
    {
      name: "bakeu-admin-demo-v1",
      merge: (persisted, current) =>
        normalizeManagement(mergeAdminState(persisted, current)),
    },
  ),
);

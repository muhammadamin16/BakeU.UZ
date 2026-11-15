import { create } from "zustand";
import { persist } from "zustand/middleware";
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
      status: "Опубликован",
    },
    {
      id: "P102",
      name: "Домашняя самса",
      shop: "Домашняя пекарня",
      price: 12000,
      category: "Выпечка",
      status: "Опубликован",
    },
    {
      id: "P103",
      name: "Овсяное печенье",
      shop: "Сладкий дом",
      price: 35000,
      category: "Печенье",
      status: "На проверке",
    },
  ],
  orders: [
    {
      id: "O101",
      customer: "Дильноза Ахмедова",
      shop: "Сладкий дом",
      total: 180000,
      date: "2026-11-15",
      status: "Новый",
    },
    {
      id: "O102",
      customer: "Умид Каримов",
      shop: "Домашняя пекарня",
      total: 72000,
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
    (set) => ({
      ...structuredClone(seed),
      save: (key, item) =>
        set((s) => ({
          [key]: s[key].some((x) => x.id === item.id)
            ? s[key].map((x) => (x.id === item.id ? item : x))
            : [{ ...item, id: item.id || crypto.randomUUID() }, ...s[key]],
        })),
      remove: (key, id) =>
        set((s) => ({ [key]: s[key].filter((x) => x.id !== id) })),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((x) =>
            !id || x.id === id ? { ...x, read: true } : x,
          ),
        })),
      saveSettings: (settings) => set({ settings }),
      decide: (id, status) =>
        set((s) => {
          const a = s.applications.find((x) => x.id === id);
          if (!a || a.status !== "На проверке") return {};
          return {
            applications: s.applications.map((x) =>
              x.id === id ? { ...x, status } : x,
            ),
            shops:
              status === "Одобрено"
                ? [
                    {
                      id: `shop-${id}`,
                      name: a.shop,
                      owner: a.name,
                      phone: a.phone,
                      address: "",
                      status: "Открыт",
                      plan: "Без подписки",
                    },
                    ...s.shops,
                  ]
                : s.shops,
            notifications: [
              {
                id: crypto.randomUUID(),
                title:
                  status === "Одобрено" ? "Магазин открыт" : "Заявка отклонена",
                text: `Магазин «${a.shop}»: ${status.toLowerCase()}`,
                time: "Только что",
                read: false,
              },
              ...s.notifications,
            ],
          };
        }),
    }),
    { name: "bakeu-admin-demo-v1" },
  ),
);

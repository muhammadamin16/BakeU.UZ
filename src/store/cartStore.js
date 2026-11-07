import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set) => ({
      items: {},

      add: (id) =>
        set((state) => ({
          items: {
            ...state.items,
            [id]: (state.items[id] || 0) + 1,
          },
        })),

      change: (id, amount) =>
        set((state) => {
          const items = { ...state.items };
          const quantity = (items[id] || 0) + amount;

          if (quantity <= 0) {
            delete items[id];
          } else {
            items[id] = quantity;
          }

          return { items };
        }),

      clear: () => set({ items: {} }),
    }),
    {
      name: "bakeu-v2-cart",
    }
  )
);
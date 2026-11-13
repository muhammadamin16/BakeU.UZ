import { create } from "zustand";
import { persist } from "zustand/middleware";
import { productData } from "./productData";
export const useFavoriteStore = create(persist((set) => ({
  items: {},
  toggle: (product) => {
    const p = productData(product);
    set(s => { const items = { ...s.items };
      if (items[p.id]) delete items[p.id]; else items[p.id] = p;
      return { items }; });
  },
  remove: (id) => set(s => { const items = { ...s.items }; delete items[id]; return { items }; }),
  clear: () => set({ items: {} }),
}), { name: "bakeu-favorites-products-v1" }));

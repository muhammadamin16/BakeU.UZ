import { create } from "zustand";
import { persist } from "zustand/middleware";
import { productData } from "./productData";
import { catalogProducts } from "../data/cartCatalog";

export const useCartStore = create(persist((set, get) => ({
  products: { ...catalogProducts }, items: {},
  add: (product) => {
    const source = typeof product === "object" ? product : get().products[product];
    if (!source) return;
    const p = productData(source);
    set(s => ({ products: { ...s.products, [p.id]: p },
      items: { ...s.items, [p.id]: (s.items[p.id] || 0) + 1 } }));
  },
  increase: id => set(s => s.items[id] ? { items: { ...s.items, [id]: s.items[id] + 1 } } : s),
  decrease: id => set(s => {
    const items = { ...s.items };
    if (items[id] > 1) items[id]--; else delete items[id];
    return { items };
  }),
  remove: id => set(s => { const items = { ...s.items }; delete items[id]; return { items }; }),
  clear: () => set({ items: {} }),
}), {
  name: "bakeu-cart",
  partialize: s => ({ items: s.items, products: s.products }),
  merge: (saved, current) => {
    const products = { ...catalogProducts };
    for (const [id, value] of Object.entries(saved?.products || {})) {
      try { const p = productData(value); if (p.id === id) products[id] = p; } catch { /* Keep catalog fallback. */ }
    }
    const items = {};
    for (const [id, qty] of Object.entries(saved?.items || {})) {
      if (Number.isSafeInteger(qty) && qty > 0) items[id] = qty;
    }
    return { ...current, products, items };
  },
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { productData } from "./productData";

// items остаётся объектом { id: количество }, как в исходном Header.
export const useCartStore = create(persist((set) => ({
  items: {}, products: {},
  add: (product) => {
    const p = productData(product);
    set(s => ({ items: { ...s.items, [p.id]: (s.items[p.id] || 0) + 1 },
      products: { ...s.products, [p.id]: p } }));
  },
  increase: (id) => set(s => s.items[id] ? ({ items: { ...s.items, [id]: s.items[id] + 1 } }) : s),
  decrease: (id) => set(s => {
    const items = { ...s.items }, products = { ...s.products };
    if (items[id] > 1) items[id]--;
    else { delete items[id]; delete products[id]; }
    return { items, products };
  }),
  remove: (id) => set(s => {
    const items = { ...s.items }, products = { ...s.products };
    delete items[id]; delete products[id]; return { items, products };
  }),
  clear: () => set({ items: {}, products: {} }),
}), { name: "bakeu-cart-products-v1" }));

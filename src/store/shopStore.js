import { create } from "zustand";
import { persist } from "zustand/middleware";
export const shopIdFor = (account) => {
  const key = (
    account.id ||
    account.email ||
    account.phone ||
    account.firstName ||
    "demo"
  )
    .trim()
    .toLowerCase();
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `local-${(hash >>> 0).toString(36)}`;
};
export const useShopStore = create(
  persist(
    (set) => ({
      shops: {},
      products: {},
      saveShop: (shop) =>
        set((s) => ({ shops: { ...s.shops, [shop.id]: shop } })),
      saveProduct: (product) =>
        set((s) => ({ products: { ...s.products, [product.id]: product } })),
      removeProduct: (id) =>
        set((s) => {
          const products = { ...s.products };
          delete products[id];
          return { products };
        }),
    }),
    { name: "bakeu-local-shops-v1" },
  ),
);
export function socialHandle(value, service) {
  const raw = value.trim().replace(/^@/, "");
  if (!raw) return "";
  let handle = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const hosts =
        service === "telegram"
          ? ["t.me", "www.t.me"]
          : ["instagram.com", "www.instagram.com"];
      if (!hosts.includes(url.hostname)) return null;
      handle = url.pathname.replace(/^\/+|\/+$/g, "");
    } catch {
      return null;
    }
  }
  return /^[a-zA-Z0-9_.]{1,64}$/.test(handle) ? handle : null;
}
export async function readPicture(file) {
  if (!file) return "";
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 1500000
  )
    throw new Error("Выберите JPG, PNG или WebP до 1,5 МБ.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось открыть изображение."));
    reader.readAsDataURL(file);
  });
}

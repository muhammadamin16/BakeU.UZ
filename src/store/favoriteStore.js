import { create } from "zustand";
import { persist } from "zustand/middleware";
import { productData } from "./productData";
import { accountAPI, phoneAccountsEnabled } from "../api/account.js";
import { createFavoritesController } from "./serverFavorites.js";

const guestStore = create(persist(() => ({ items: {} }), { name: "bakeu-favorites-products-v1" }));
const guest = {
  read: () => guestStore.getState().items,
  change(id, remove, clear) {
    const items = clear ? {} : { ...guest.read() };
    if (remove) delete items[id];
    else if (!clear) items[id] = { id, productId: id };
    guestStore.setState({ items });
  },
};
let controller;
export const useFavoriteStore = create((set) => ({
  items: phoneAccountsEnabled ? {} : guest.read(), busy: false, error: "",
  load: () => run(() => controller?.load()),
  toggle: (product) => run(async () => {
    if (!controller) {
      const p = productData(product), items = { ...guest.read() };
      if (items[p.id]) delete items[p.id]; else items[p.id] = p;
      guestStore.setState({ items }); set({ items }); return;
    }
    await controller.load();
    const id = String(product.productId || product.id);
    await controller.change(id, controller.saved(id));
  }),
  remove: (id) => run(() => controller ? controller.change(id, true) : (guest.change(id, true), set({ items: guest.read() }))),
  clear: () => run(() => controller ? controller.change("", true, true) : (guest.change("", true, true), set({ items: {} }))),
}));
async function run(action) {
  if (useFavoriteStore.getState().busy) return;
  useFavoriteStore.setState({ busy: true, error: "" });
  try { await action(); }
  catch (error) { useFavoriteStore.setState({ error: error.message || "Не удалось сохранить избранное." }); }
  finally { useFavoriteStore.setState({ busy: false }); }
}
if (phoneAccountsEnabled && accountAPI) {
  controller = createFavoritesController({ request: accountAPI.requestWithOptions, guest, publish: useFavoriteStore.setState });
  accountAPI.subscribeAccount((user) => { controller.reset(user); void useFavoriteStore.getState().load(); });
}

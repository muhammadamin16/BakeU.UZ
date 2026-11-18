import { translateText } from "../i18n/index.js";
import { detailsFor } from "../pages/Product/productDetails.js";

export const checkoutMoney = (n) =>
  new Intl.NumberFormat("ru-RU").format(n) + " сум";
export const localDay = (now = Date.now()) => {
  const d = new Date(now);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
export function contactPhone(value) {
  if (!/^[+()\d\s-]+$/.test(String(value || ""))) return "";
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 9
    ? "+998" + digits
    : digits.length === 12 && digits.startsWith("998")
      ? "+" + digits
      : "";
}
export const emptySchedule = () => ({
  method: "pickup",
  date: "",
  time: "",
  note: "",
  agreedFor: "",
});
export function groupSignature(group, schedule) {
  return JSON.stringify([
    group.shop.id,
    group.items.map((p) => [p.id, p.quantity, p.price]),
    schedule.method,
    schedule.date,
    schedule.time,
  ]);
}

// Rebuild from today's catalog; persisted cart prices/shops are only snapshots.
export function checkoutGroups(cart, catalog, shops) {
  const groups = new Map(),
    issues = [];
  for (const [id, quantity] of Object.entries(cart.items || {})) {
    const saved = cart.products?.[id];
    const productId = String(saved?.productId || id.split("::")[0]);
    const raw = catalog.find((p) => String(p.id) === productId);
    const p = raw && detailsFor(raw);
    const shopId = p?.shopId || p?.sellerId;
    const shop = shops.find((s) => s.id === shopId);
    const variantId =
      id === productId
        ? "base"
        : id.startsWith(productId + "::")
          ? id.slice(productId.length + 2)
          : "";
    const variant = p?.variants?.find((v) => v.id === variantId);
    const price = Number(variant?.price ?? p?.price);
    if (
      !p ||
      p.available === false ||
      !shop ||
      shop.status === "blocked" ||
      (variantId !== "base" && !variant) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 9999 ||
      !Number.isFinite(price) ||
      price > Number.MAX_SAFE_INTEGER / 100 ||
      price < 0
    ) {
      issues.push({
        id,
        name: saved?.name || p?.name || "Товар",
        reason:
          "Товар или выбранный вариант недоступен. Удалите его из корзины и выберите заново.",
      });
      continue;
    }
    const line = {
      id,
      productId,
      name: p.name,
      variantLabel: variant?.label || "",
      unit: p.unit || "шт.",
      price,
      image: p.image || "",
      shopId,
      quantity,
    };
    if (!groups.has(shopId))
      groups.set(shopId, {
        shop: { ...shop },
        items: [],
        total: 0,
        priceChanged: false,
      });
    const group = groups.get(shopId);
    group.items.push(line);
    group.total += price * quantity;
    group.priceChanged ||= saved != null && Number(saved.price) !== price;
  }
  for (const group of groups.values()) {
    if (!Number.isSafeInteger(Math.round(group.total * 100)))
      issues.push({
        id: group.items[0].id,
        name: group.shop.name,
        reason: "Сумма заказа слишком велика. Уменьшите количество товаров.",
      });
  }
  return { groups: [...groups.values()], issues };
}

export function orderMessage(order, draft = false, language = "ru") {
  const t = (text) => translateText(text, language);
  const money = (amount) => t(checkoutMoney(amount));
  const when =
    order.schedule?.date && order.schedule?.time
      ? order.schedule.date.split("-").reverse().join(".") +
        t(" в ") +
        order.schedule.time
      : t("хочу согласовать дату и время");
  const delivery = order.fulfillment === "delivery";

  return [
    draft
      ? t("Здравствуйте! Хочу уточнить заказ в ") + order.shopName + "."
      : t("BakeU · заявка №") + order.id.slice(0, 8) + " · " + order.shopName,
    ...order.items.map(
      (p) =>
        t(p.name) +
        (p.variantLabel ? " (" + t(p.variantLabel) + ")" : "") +
        " × " +
        p.quantity +
        " — " +
        money(p.price * p.quantity),
    ),
    t("Товары: ") + money(order.total),
    (delivery
      ? t("Доставка: ") + (order.address || t("адрес уточню"))
      : t("Самовывоз")) +
      "; " +
      when +
      ".",
    t("Покупатель: ") +
      (order.buyerName || t("имя уточню")) +
      (order.buyerPhone ? ", " + order.buyerPhone : ""),
    order.note ? t("Комментарий: ") + order.note : "",
    t(delivery
      ? "Пожалуйста, подтвердите наличие, время и окончательную стоимость с доставкой."
      : "Пожалуйста, подтвердите наличие, время и окончательную стоимость."),
  ]
    .filter(Boolean)
    .join("\n");
}

export function smsLink(phone, text, apple = false) {
  const number = contactPhone(phone);
  return number
    ? "sms:" + number + (apple ? "&" : "?") + "body=" + encodeURIComponent(text)
    : "";
}

export function prepareCheckout(
  state,
  {
    account,
    buyerId,
    ownShopId,
    cart,
    catalog,
    shops,
    details,
    checkoutId,
    now = Date.now(),
  },
) {
  if (!account || !["client", "seller"].includes(account.role) || !buyerId)
    throw Error("Войдите в аккаунт, чтобы сохранить заявку.");
  if (!/^[a-zA-Z0-9-]{10,80}$/.test(checkoutId || ""))
    throw Error("Обновите страницу оформления.");
  const existing = state.orders.filter((o) => o.checkoutId === checkoutId);
  if (existing.length) {
    if (existing.some((o) => o.buyerId !== buyerId))
      throw Error("Эта заявка недоступна.");
    return { orders: existing, threads: state.threads, repeated: true };
  }
  const { groups, issues } = checkoutGroups(cart, catalog, shops);
  if (!groups.length || issues.length)
    throw Error("Проверьте корзину: есть недоступные товары.");
  const name = String(details.name || "").trim();
  const phone = contactPhone(details.phone);
  if (name.length < 2 || name.length > 100)
    throw Error("Укажите имя: от 2 до 100 символов.");
  if (!phone) throw Error("Укажите телефон Узбекистана: +998 и 9 цифр.");
  const threads = state.threads.map((t) => ({
    ...t,
    messages: [...t.messages],
  }));
  const orders = groups.map((group) => {
    const slot = details.sellers?.[group.shop.id] || emptySchedule();
    if (ownShopId === group.shop.id)
      throw Error("Нельзя оформить заказ в собственном магазине.");
    if (!["pickup", "delivery"].includes(slot.method))
      throw Error("Выберите способ получения для " + group.shop.name + ".");
    const date = new Date(slot.date + "T" + slot.time + ":00");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(slot.date) ||
      !/^\d{2}:\d{2}$/.test(slot.time) ||
      !Number.isFinite(date.getTime()) ||
      localDay(date) !== slot.date ||
      date.getTime() <= now
    )
      throw Error("Выберите будущую дату и время для " + group.shop.name + ".");
    if (slot.agreedFor !== groupSignature(group, slot))
      throw Error("Согласуйте наличие и время с " + group.shop.name + ".");
    const address =
      slot.method === "delivery"
        ? String(details.address || "").trim()
        : group.shop.address || "Уточните место самовывоза у продавца";
    if (
      slot.method === "delivery" &&
      (address.length < 8 || address.length > 300)
    )
      throw Error("Укажите полный адрес доставки: от 8 до 300 символов.");
    const order = {
      id: crypto.randomUUID(),
      checkoutId,
      buyerId,
      buyerName: name,
      buyerPhone: phone,
      shopId: group.shop.id,
      shopName: group.shop.name,
      shopPhone: group.shop.phone || "",
      shopTelegram: group.shop.telegram || "",
      items: group.items,
      total: group.total,
      fulfillment: slot.method,
      address,
      schedule: { date: slot.date, time: slot.time },
      agreedAt: now,
      note: String(slot.note || "")
        .trim()
        .slice(0, 1000),
      payment: "direct",
      status: "Новый",
      at: now,
      history: [
        {
          status: "Новый",
          at: now,
          note: "Заявка сохранена покупателем; ожидает подтверждения продавца",
        },
      ],
    };
    let thread = threads.find(
      (t) => t.buyerId === buyerId && t.shopId === group.shop.id,
    );
    if (!thread) {
      thread = {
        id: crypto.randomUUID(),
        buyerId,
        buyerName: name,
        shopId: group.shop.id,
        shopName: group.shop.name,
        messages: [],
      };
      threads.unshift(thread);
    }
    thread.messages.push({
      id: crypto.randomUUID(),
      from: "buyer",
      kind: "order",
      orderId: order.id,
      text: orderMessage(order),
      at: now,
      read: false,
    });
    return order;
  });
  return { orders, threads, repeated: false };
}

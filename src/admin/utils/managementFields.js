import { nextOrderStatuses, shopRestriction } from "./management";
import { localDate } from "./subscriptions";

export function productFields(shops) {
  return [
    { key: "name", label: "Товар" },
    {
      key: "shopId",
      label: "Магазин",
      options: shops.map((row) => ({ value: row.id, label: row.name })),
    },
    {
      key: "category",
      label: "Категория",
      options: ["Торты", "Выпечка", "Печенье", "Хлеб", "Другое"],
    },
    { key: "price", label: "Цена, сум", type: "number" },
    { key: "image", label: "Фото товара", type: "image", required: false },
    {
      key: "description",
      label: "Описание",
      type: "textarea",
      required: false,
    },
    {
      key: "status",
      label: "Статус",
      options: ["На проверке", "Опубликован", "Скрыт"],
    },
  ];
}

export function orderFields(state, existing) {
  const finished =
    existing && ["Доставлен", "Отменён"].includes(existing.status);
  return [
    {
      key: "customerId",
      label: "Покупатель",
      options: state.customers
        .filter((row) => existing || row.status === "Активен")
        .map((row) => ({
          value: row.id,
          label: `${row.name}${row.status !== "Активен" ? ` · ${row.status}` : ""}`,
        })),
      disabled: finished,
    },
    {
      key: "shopId",
      label: "Магазин",
      options: state.shops
        .filter((row) => existing || !shopRestriction(state, row.id))
        .map((row) => ({ value: row.id, label: row.name })),
      disabled: finished,
    },
    {
      key: "items",
      label: "Состав заказа",
      type: "orderItems",
      products: state.products,
      disabled: finished,
    },
    {
      key: "total",
      label: "Сумма заказа, сум",
      type: "number",
      readOnly: (values) => finished || Boolean(values.items?.length),
      hint: "Для заказа с товарами сумма рассчитывается автоматически.",
    },
    { key: "date", label: "Дата заказа", type: "date" },
    {
      key: "status",
      label: "Статус",
      options: existing
        ? [existing.status, ...nextOrderStatuses(existing.status)]
        : ["Новый"],
    },
    {
      key: "notes",
      label: "Примечание к заказу",
      type: "textarea",
      required: false,
    },
  ];
}

export function subscriptionFields(shops) {
  return [
    {
      key: "shopId",
      label: "Магазин",
      options: shops.map((row) => ({ value: row.id, label: row.name })),
    },
    { key: "plan", label: "Тариф", options: ["BakeU Pro"] },
    {
      key: "paid",
      label: "Оплачено, сум",
      type: "number",
      hint: "Учётная сумма. Сохранение не проводит банковский платёж.",
    },
    { key: "until", label: "Действует до", type: "date" },
    { key: "notes", label: "Примечание", type: "textarea", required: false },
  ];
}

export function newOrderDefaults() {
  return { status: "Новый", date: localDate(Date.now()), items: [], total: 0 };
}

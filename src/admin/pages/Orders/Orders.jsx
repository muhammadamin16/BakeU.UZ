import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import "./Orders.css";
const fields = [
  { key: "customer", label: "Покупатель" },
  { key: "shop", label: "Магазин" },
  { key: "total", label: "Сумма", type: "number" },
  { key: "date", label: "Дата заказа", type: "date" },
  {
    key: "status",
    label: "Статус",
    options: ["Новый", "В работе", "Доставлен", "Отменён"],
  },
];
const columns = [
  { key: "id", label: "ID" },
  { key: "customer", label: "Покупатель" },
  { key: "shop", label: "Магазин" },
  { key: "total", label: "Сумма" },
  { key: "date", label: "Дата заказа" },
  { key: "status", label: "Статус" },
].map((c) => ({
  ...c,
  render: ["price", "total", "paid"].includes(c.key)
    ? (r) => money(r[c.key])
    : ["date", "until"].includes(c.key)
      ? (r) => date(r[c.key])
      : undefined,
}));
export default function Orders() {
  return (
    <CollectionPage
      title="Заказы"
      collection="orders"
      fields={fields}
      columns={columns}
    />
  );
}

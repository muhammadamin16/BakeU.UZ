import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import "./Subscriptions.css";
const fields = [
  { key: "name", label: "Продавец" },
  { key: "shop", label: "Магазин" },
  { key: "plan", label: "Тариф", options: ["BakeU Pro"] },
  { key: "paid", label: "Оплачено", type: "number" },
  { key: "until", label: "Действует до", type: "date" },
  {
    key: "status",
    label: "Статус",
    options: ["Активна", "Скоро истекает", "Истекла"],
  },
];
const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Продавец" },
  { key: "shop", label: "Магазин" },
  { key: "plan", label: "Тариф" },
  { key: "paid", label: "Оплачено" },
  { key: "until", label: "Действует до" },
  { key: "status", label: "Статус" },
].map((c) => ({
  ...c,
  render: ["price", "total", "paid"].includes(c.key)
    ? (r) => money(r[c.key])
    : ["date", "until"].includes(c.key)
      ? (r) => date(r[c.key])
      : undefined,
}));
export default function Subscriptions() {
  return (
    <CollectionPage
      title="Подписки"
      collection="subscriptions"
      fields={fields}
      columns={columns}
    />
  );
}

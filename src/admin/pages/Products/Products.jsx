import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import "./Products.css";
const fields = [
  { key: "name", label: "Товар" },
  { key: "shop", label: "Магазин" },
  {
    key: "category",
    label: "Категория",
    options: ["Торты", "Выпечка", "Печенье", "Другое"],
  },
  { key: "price", label: "Цена", type: "number" },
  {
    key: "status",
    label: "Статус",
    options: ["На проверке", "Опубликован", "Скрыт"],
  },
];
const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Товар" },
  { key: "shop", label: "Магазин" },
  { key: "category", label: "Категория" },
  { key: "price", label: "Цена" },
  { key: "status", label: "Статус" },
].map((c) => ({
  ...c,
  render: ["price", "total", "paid"].includes(c.key)
    ? (r) => money(r[c.key])
    : ["date", "until"].includes(c.key)
      ? (r) => date(r[c.key])
      : undefined,
}));
export default function Products() {
  return (
    <CollectionPage
      title="Товары"
      collection="products"
      fields={fields}
      columns={columns}
    />
  );
}

import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import { Link } from "react-router-dom";
import "./Shops.css";
const fields = [
  { key: "name", label: "Магазин" },
  { key: "owner", label: "Продавец" },
  { key: "phone", label: "Телефон", type: "tel" },
  { key: "address", label: "Адрес" },
  { key: "plan", label: "Тариф", options: ["Без подписки", "BakeU Pro"] },
  { key: "status", label: "Статус", options: ["Открыт", "Заблокирован"] },
];
const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Магазин" },
  { key: "owner", label: "Продавец" },
  { key: "phone", label: "Телефон" },
  { key: "address", label: "Адрес" },
  { key: "plan", label: "Тариф" },
  { key: "status", label: "Статус" },
].map((c) => ({
  ...c,
  render: ["price", "total", "paid"].includes(c.key)
    ? (r) => money(r[c.key])
    : ["date", "until"].includes(c.key)
      ? (r) => date(r[c.key])
      : undefined,
}));
export default function Shops() {
  return (
    <CollectionPage
      title="Магазины и продавцы"
      collection="shops"
      fields={fields}
      columns={columns}
      detailsLink={(row) => (
        <Link className="ad-btn small" to={`/admin/shops/${row.id}`}>
          Открыть
        </Link>
      )}
    />
  );
}

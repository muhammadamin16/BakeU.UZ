import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import { Link } from "react-router-dom";
import { useAdminStore } from "../../store/adminStore";
import "./Shops.css";
const fields = [
  { key: "name", label: "Магазин" },
  { key: "phone", label: "Телефон", type: "tel" },
  { key: "address", label: "Адрес" },
  { key: "plan", label: "Тариф", options: ["Без подписки", "BakeU Pro"] },
  { key: "status", label: "Статус", options: ["Открыт", "Заблокирован"] },
];
const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Магазин" },
  {
    key: "owner",
    label: "Продавец",
    render: (row) =>
      row.sellerId ? (
        <Link
          className="ad-text-link"
          to={`/admin/sellers/${encodeURIComponent(row.sellerId)}`}
        >
          {translateText(row.owner)}{" "}
          <ArrowUpRight
            size={12}
            className="ad-inline-arrow"
            aria-hidden="true"
          />
        </Link>
      ) : (
        row.owner
      ),
  },
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
      : c.render,
}));
export default function Shops() {
  const sellers = useAdminStore((state) => state.sellers);
  const shopFields = [
    fields[0],
    {
      key: "sellerId",
      label: "Продавец",
      options: sellers.map((seller) => ({
        value: seller.id,
        label: seller.name,
      })),
    },
    ...fields.slice(1),
  ];
  return (
    <CollectionPage
      title={translateText("Магазины")}
      collection="shops"
      fields={shopFields}
      columns={columns}
      detailsLink={(row) => (
        <Link className="ad-btn small" to={`/admin/shops/${row.id}`}>
          {translateText("Открыть")}
        </Link>
      )}
    />
  );
}

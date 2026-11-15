import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import { useAdminStore } from "../../store/adminStore";
import "./Applications.css";
const allFields = [
  { key: "name", label: "Заявитель" },
  { key: "shop", label: "Магазин" },
  { key: "phone", label: "Телефон", type: "tel" },
  { key: "date", label: "Дата заявки", type: "date" },
  { key: "status", label: "Статус", options: ["На проверке"] },
];
const fields = allFields.filter((f) => f.key !== "status");
const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Заявитель" },
  { key: "shop", label: "Магазин" },
  { key: "phone", label: "Телефон" },
  { key: "date", label: "Дата заявки" },
  { key: "status", label: "Статус" },
].map((c) => ({
  ...c,
  render: ["price", "total", "paid"].includes(c.key)
    ? (r) => money(r[c.key])
    : ["date", "until"].includes(c.key)
      ? (r) => date(r[c.key])
      : undefined,
}));
export default function Applications() {
  const decide = useAdminStore((s) => s.decide);
  return (
    <CollectionPage
      title="Заявки на открытие магазина"
      collection="applications"
      fields={fields}
      columns={columns}
      renderActions={(row) =>
        row.status === "На проверке" && (
          <>
            <button
              className="ad-btn small green"
              onClick={() => decide(row.id, "Одобрено")}
            >
              ✓ Одобрить
            </button>
            <button
              className="ad-btn small red"
              onClick={() => decide(row.id, "Отклонено")}
            >
              × Отклонить
            </button>
          </>
        )
      }
    />
  );
}

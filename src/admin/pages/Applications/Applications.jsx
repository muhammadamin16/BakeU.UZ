import { translateText } from "../../../i18n/index.js";
import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import { ApplicationDecisionActions } from "../../components/ManagementActions";
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
  return (
    <CollectionPage
      title={translateText("Заявки на открытие магазина")}
      collection="applications"
      fields={fields}
      columns={columns}
      renderActions={(row) => <ApplicationDecisionActions application={row} />}
    />
  );
}

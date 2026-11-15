import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import "./Customers.css";
const fields = [
  { key: "name", label: "Имя" },
  { key: "phone", label: "Телефон", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "date", label: "Дата регистрации", type: "date" },
  { key: "status", label: "Статус", options: ["Активен", "Заблокирован"] },
];
const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Имя" },
  { key: "phone", label: "Телефон" },
  { key: "email", label: "Email" },
  { key: "date", label: "Дата регистрации" },
  { key: "status", label: "Статус" },
].map((c) => ({
  ...c,
  render: ["price", "total", "paid"].includes(c.key)
    ? (r) => money(r[c.key])
    : ["date", "until"].includes(c.key)
      ? (r) => date(r[c.key])
      : undefined,
}));
export default function Customers() {
  return (
    <CollectionPage
      title="Покупатели"
      collection="customers"
      fields={fields}
      columns={columns}
    />
  );
}

import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { money, date } from "../../utils/format";
import { CollectionPage } from "../../components/AdminUI";
import AccountLink from "../../components/AccountLink";
import { Link } from "react-router-dom";
import { accountFields } from "../../utils/accountFields";
import "./Customers.css";
const fields = accountFields("customers");
const columns = [
  { key: "id", label: "ID" },
  {
    key: "name",
    label: "Покупатель",
    render: (row) => <AccountLink person={row} />,
  },
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
      : c.render,
}));
export default function Customers() {
  return (
    <CollectionPage
      title={translateText("Покупатели")}
      collection="customers"
      fields={fields}
      columns={columns}
      detailsLink={(row) => (
        <Link
          className="ad-btn small"
          to={`/admin/customers/${encodeURIComponent(row.id)}`}
        >
          {translateText("Профиль")}{" "}
          <ArrowUpRight
            size={12}
            className="ad-inline-arrow"
            aria-hidden="true"
          />
        </Link>
      )}
    />
  );
}

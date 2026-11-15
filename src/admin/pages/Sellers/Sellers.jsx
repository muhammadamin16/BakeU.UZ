import { Link } from "react-router-dom";
import { CollectionPage } from "../../components/AdminUI";
import AccountLink from "../../components/AccountLink";
import { useAdminStore } from "../../store/adminStore";
import { accountFields } from "../../utils/accountFields";
import { date } from "../../utils/format";

export default function Sellers() {
  const shops = useAdminStore((state) => state.shops);
  const columns = [
    { key: "id", label: "ID" },
    {
      key: "name",
      label: "Продавец",
      render: (row) => <AccountLink person={row} kind="sellers" />,
    },
    { key: "phone", label: "Телефон" },
    { key: "email", label: "Email" },
    {
      key: "shops",
      label: "Магазины",
      render: (row) => shops.filter((shop) => shop.sellerId === row.id).length,
    },
    { key: "date", label: "Дата регистрации", render: (row) => date(row.date) },
    { key: "status", label: "Статус" },
  ];
  return (
    <CollectionPage
      title="Продавцы"
      collection="sellers"
      fields={accountFields("sellers")}
      columns={columns}
      canDelete={(row) => !shops.some((shop) => shop.sellerId === row.id)}
      detailsLink={(row) => (
        <Link
          className="ad-btn small"
          to={`/admin/sellers/${encodeURIComponent(row.id)}`}
        >
          Профиль ↗
        </Link>
      )}
    />
  );
}

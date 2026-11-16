import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, CollectionPage } from "../../components/AdminUI";
import { SubscriptionAction } from "../../components/ManagementActions";
import { useAdminStore } from "../../store/adminStore";
import { subscriptionFields } from "../../utils/managementFields";
import { subscriptionStatus } from "../../utils/subscriptions";
import { date, money } from "../../utils/format";
import "./Subscriptions.css";

export default function Subscriptions() {
  const state = useAdminStore();
  const [params] = useSearchParams();
  const shops = state.shops.filter(
    (row) =>
      (!params.get("sellerId") || row.sellerId === params.get("sellerId")) &&
      (!params.get("shopId") || row.id === params.get("shopId")),
  );
  const enabledShops = shops.filter((shop) =>
    state.sellers.some(
      (seller) => seller.id === shop.sellerId && seller.status === "Активен",
    ),
  );
  const columns = [
    {
      key: "id",
      label: "ID",
      render: (row) => (
        <Link
          className="ad-text-link"
          to={`/admin/subscriptions/${encodeURIComponent(row.id)}`}
        >
          {translateText(row.id)}{" "}
          <ArrowUpRight
            size={12}
            className="ad-inline-arrow"
            aria-hidden="true"
          />
        </Link>
      ),
    },
    {
      key: "name",
      label: "Продавец",
      render: (row) =>
        row.sellerId ? (
          <Link
            className="ad-text-link"
            to={`/admin/sellers/${encodeURIComponent(row.sellerId)}`}
          >
            {translateText(row.name)}{" "}
            <ArrowUpRight
              size={12}
              className="ad-inline-arrow"
              aria-hidden="true"
            />
          </Link>
        ) : (
          row.name
        ),
    },
    { key: "shop", label: "Магазин" },
    { key: "plan", label: "Тариф" },
    { key: "paid", label: "Оплачено", render: (row) => money(row.paid) },
    {
      key: "until",
      label: "Срок",
      render: (row) =>
        row.status === "Приостановлена"
          ? `На паузе · ${Number(row.remainingMs) > 0 ? Math.ceil(row.remainingMs / 86400000) + " дн." : "остаток не указан"}`
          : date(row.until),
    },
    {
      key: "status",
      label: "Статус",
      render: (row) => <Badge>{translateText(subscriptionStatus(row))}</Badge>,
    },
  ];
  return (
    <>
      <p className="ad-page-description">
        {translateText(
          "Приостановка сохраняет остаток срока. Управление банковскими списаниями не подключено.",
        )}
      </p>
      <CollectionPage
        title={translateText("Подписки")}
        collection="subscriptions"
        addDisabled={
          !enabledShops.length
            ? "Сначала разморозьте продавца или создайте магазин."
            : ""
        }
        fields={(existing) =>
          subscriptionFields(existing?.id ? shops : enabledShops)
        }
        columns={columns}
        defaultValues={{ plan: "BakeU Pro", paid: 0, status: "Активна" }}
        renderActions={(row) => <SubscriptionAction subscription={row} />}
        detailsLink={(row) => (
          <Link
            className="ad-btn small"
            to={`/admin/subscriptions/${encodeURIComponent(row.id)}`}
          >
            {translateText("Открыть")}{" "}
            <ArrowUpRight
              size={12}
              className="ad-inline-arrow"
              aria-hidden="true"
            />
          </Link>
        )}
      />
    </>
  );
}

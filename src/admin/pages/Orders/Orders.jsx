import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { CollectionPage } from "../../components/AdminUI";
import { OrderStatusActions } from "../../components/ManagementActions";
import { useAdminStore } from "../../store/adminStore";
import { newOrderDefaults, orderFields } from "../../utils/managementFields";
import { shopRestriction } from "../../utils/management";
import { date, money } from "../../utils/format";
import "./Orders.css";

export default function Orders() {
  const state = useAdminStore();
  const [params] = useSearchParams();
  const scoped = {
    ...state,
    customers: state.customers.filter(
      (row) => !params.get("customerId") || row.id === params.get("customerId"),
    ),
    shops: state.shops.filter(
      (row) =>
        (!params.get("sellerId") || row.sellerId === params.get("sellerId")) &&
        (!params.get("shopId") || row.id === params.get("shopId")),
    ),
  };
  const owner = state.sellers.find((row) => row.id === params.get("sellerId"));
  const addDisabled =
    owner && owner.status !== "Активен"
      ? "Новые заказы недоступны: аккаунт продавца заморожен или заблокирован."
      : !scoped.customers.some((row) => row.status === "Активен")
        ? "Новые заказы недоступны: нет активного покупателя."
        : !scoped.shops.some((row) => !shopRestriction(state, row.id))
          ? "Новые заказы недоступны: нет доступных магазинов с действующим тарифом."
          : "";
  const columns = [
    {
      key: "id",
      label: "Заказ",
      render: (row) => (
        <Link
          className="ad-text-link"
          to={`/admin/orders/${encodeURIComponent(row.id)}`}
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
      key: "customer",
      label: "Покупатель",
      render: (row) =>
        row.customerId ? (
          <Link
            className="ad-text-link"
            to={`/admin/customers/${encodeURIComponent(row.customerId)}`}
          >
            {translateText(row.customer)}{" "}
            <ArrowUpRight
              size={12}
              className="ad-inline-arrow"
              aria-hidden="true"
            />
          </Link>
        ) : (
          row.customer
        ),
    },
    {
      key: "shop",
      label: "Магазин",
      render: (row) =>
        row.shopId ? (
          <Link
            className="ad-text-link"
            to={`/admin/shops/${encodeURIComponent(row.shopId)}`}
          >
            {translateText(row.shop)}{" "}
            <ArrowUpRight
              size={12}
              className="ad-inline-arrow"
              aria-hidden="true"
            />
          </Link>
        ) : (
          row.shop
        ),
    },
    { key: "total", label: "Сумма", render: (row) => money(row.total) },
    { key: "date", label: "Дата", render: (row) => date(row.date) },
    { key: "status", label: "Статус" },
  ];
  return (
    <CollectionPage
      title={translateText("Заказы")}
      collection="orders"
      addDisabled={addDisabled}
      fields={(existing) => orderFields(scoped, existing?.id ? existing : null)}
      columns={columns}
      defaultValues={newOrderDefaults}
      renderActions={(row) => <OrderStatusActions order={row} />}
      detailsLink={(row) => (
        <Link
          className="ad-btn small"
          to={`/admin/orders/${encodeURIComponent(row.id)}`}
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
  );
}

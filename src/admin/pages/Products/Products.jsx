import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, CollectionPage } from "../../components/AdminUI";
import ProductPhoto from "../../components/ProductPhoto";
import { ProductStatusAction } from "../../components/ManagementActions";
import { useAdminStore } from "../../store/adminStore";
import { productFields } from "../../utils/managementFields";
import { shopRestriction } from "../../utils/management";
import { money } from "../../utils/format";
import "./Products.css";

export default function Products() {
  const state = useAdminStore();
  const [params] = useSearchParams();
  const shops = state.shops.filter(
    (row) =>
      (!params.get("sellerId") || row.sellerId === params.get("sellerId")) &&
      (!params.get("shopId") || row.id === params.get("shopId")),
  );
  const columns = [
    { key: "id", label: "ID" },
    {
      key: "name",
      label: "Товар",
      render: (row) => (
        <Link
          className="ad-product-link"
          to={`/admin/products/${encodeURIComponent(row.id)}`}
        >
          <ProductPhoto src={row.image} alt={translateText(row.name)} />
          <span>
            <strong>{translateText(row.name)}</strong>
            <small>
              {translateText("Открыть товар")}{" "}
              <ArrowUpRight
                size={12}
                className="ad-inline-arrow"
                aria-hidden="true"
              />
            </small>
          </span>
        </Link>
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
    { key: "category", label: "Категория" },
    { key: "price", label: "Цена", render: (row) => money(row.price) },
    {
      key: "status",
      label: "Статус",
      render: (row) => (
        <>
          <Badge>{translateText(row.status)}</Badge>
          {shopRestriction(state, row.shopId) && (
            <small title={translateText(shopRestriction(state, row.shopId))}>
              {translateText("Недоступен для новых заказов")}
            </small>
          )}
        </>
      ),
    },
  ];
  return (
    <CollectionPage
      title={translateText("Товары")}
      collection="products"
      addDisabled={
        !shops.length ? "Сначала создайте магазин для этого продавца." : ""
      }
      fields={productFields(shops)}
      columns={columns}
      defaultValues={{ status: "На проверке", image: "" }}
      renderActions={(row) => <ProductStatusAction product={row} />}
      detailsLink={(row) => (
        <Link
          className="ad-btn small"
          to={`/admin/products/${encodeURIComponent(row.id)}`}
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

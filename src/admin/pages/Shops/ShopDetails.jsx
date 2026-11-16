import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import ProductPhoto from "../../components/ProductPhoto";
import { money } from "../../utils/format";
import { Link, useParams } from "react-router-dom";
import { useAdminStore } from "../../store/adminStore";
import { PageTitle, Badge } from "../../components/AdminUI";
import "./ShopDetails.css";
export default function ShopDetails() {
  const { id } = useParams();
  const shop = useAdminStore((s) => s.shops.find((x) => x.id === id));
  const products = useAdminStore((s) => s.products);
  const orders = useAdminStore((s) => s.orders);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  if (!shop)
    return (
      <>
        <PageTitle title={translateText("Магазин не найден")} />
        <Link to="/admin/shops">{translateText("Вернуться к магазинам")}</Link>
      </>
    );
  return (
    <>
      <PageTitle title={translateText(shop.name)}>
        <Link className="ad-btn" to="/admin/shops">
          {translateText("← Все магазины")}
        </Link>
      </PageTitle>
      <section className="ad-panel">
        <h2>{translateText("Магазин и продавец")}</h2>
        <dl className="ad-details">
          {[
            [
              "Продавец",
              shop.sellerId ? (
                <Link
                  className="ad-text-link"
                  to={`/admin/sellers/${encodeURIComponent(shop.sellerId)}`}
                >
                  {translateText(shop.owner)}{" "}
                  <ArrowUpRight
                    size={12}
                    className="ad-inline-arrow"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                shop.owner
              ),
            ],
            ["Телефон", shop.phone],
            ["Адрес", shop.address || "Не указан"],
            ["Тариф", shop.plan],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{translateText(k)}</dt>
              <dd>{translateText(v)}</dd>
            </div>
          ))}
        </dl>
        <Badge>{translateText(shop.status)}</Badge>
      </section>
      {[
        ["Товары", products.filter((x) => x.shopId === shop.id), "products"],
        ["Заказы", orders.filter((x) => x.shopId === shop.id), "orders"],
        [
          "Подписки",
          subscriptions.filter((x) => x.shopId === shop.id),
          "subscriptions",
        ],
      ].map(([title, rows, path]) => (
        <section className="ad-panel" key={path}>
          <div className="ad-section-heading">
            <h2>{translateText(title)}</h2>
            <Link
              className="ad-btn small"
              to={`/admin/${path}?shopId=${encodeURIComponent(shop.id)}`}
            >
              {translateText("Управлять ›")}
            </Link>
          </div>
          {rows.length ? (
            rows.map((r) => (
              <div className="ad-detail-row" key={r.id}>
                <Link
                  className="ad-text-link"
                  to={`/admin/${path}/${encodeURIComponent(r.id)}`}
                >
                  {path === "products" && (
                    <ProductPhoto src={r.image} alt={translateText(r.name)} />
                  )}
                  {translateText(r.name || r.customer || r.id)}{" "}
                  <ArrowUpRight
                    size={12}
                    className="ad-inline-arrow"
                    aria-hidden="true"
                  />
                </Link>
                <span>
                  {translateText(
                    r.price
                      ? money(r.price)
                      : r.total
                        ? money(r.total)
                        : r.plan,
                  )}
                </span>
                <Badge>{translateText(r.status)}</Badge>
              </div>
            ))
          ) : (
            <p className="ad-muted">{translateText("Записей пока нет")}</p>
          )}
        </section>
      ))}
    </>
  );
}

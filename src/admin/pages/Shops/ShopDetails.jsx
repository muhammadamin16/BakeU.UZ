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
        <PageTitle title="Магазин не найден" />
        <Link to="/admin/shops">Вернуться к магазинам</Link>
      </>
    );
  return (
    <>
      <PageTitle title={shop.name}>
        <Link className="ad-btn" to="/admin/shops">
          ← Все магазины
        </Link>
      </PageTitle>
      <section className="ad-panel">
        <h2>Магазин и продавец</h2>
        <dl className="ad-details">
          {[
            ["Продавец", shop.owner],
            ["Телефон", shop.phone],
            ["Адрес", shop.address || "Не указан"],
            ["Тариф", shop.plan],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <Badge>{shop.status}</Badge>
      </section>
      {[
        ["Товары", products.filter((x) => x.shop === shop.name), "products"],
        ["Заказы", orders.filter((x) => x.shop === shop.name), "orders"],
        [
          "Подписки",
          subscriptions.filter((x) => x.shop === shop.name),
          "subscriptions",
        ],
      ].map(([title, rows, path]) => (
        <section className="ad-panel" key={path}>
          <div className="ad-section-heading">
            <h2>{title}</h2>
            <Link
              className="ad-btn small"
              to={`/admin/${path}?q=${encodeURIComponent(shop.name)}`}
            >
              Управлять ›
            </Link>
          </div>
          {rows.length ? (
            rows.map((r) => (
              <div className="ad-detail-row" key={r.id}>
                <span>{r.name || r.customer || r.id}</span>
                <span>
                  {r.price ? money(r.price) : r.total ? money(r.total) : r.plan}
                </span>
                <Badge>{r.status}</Badge>
              </div>
            ))
          ) : (
            <p className="ad-muted">Записей пока нет</p>
          )}
        </section>
      ))}
    </>
  );
}

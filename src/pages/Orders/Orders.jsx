import { getLocale } from "../../i18n/index.js";
import { translateText } from "../../i18n/index.js";
import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { getSessionProfile } from "../../store/session";
import { accountId } from "../../store/localAccount";
import { useWorkspace } from "../../store/workspaceStore";
import { checkoutMoney } from "../../store/checkout";
import "../Checkout/Checkout.css";

export default function Orders() {
  const account = getSessionProfile();
  const all = useWorkspace((s) => s.orders);
  const [filter, setFilter] = useState("Все");
  if (!account) return <Navigate to="/login?next=%2Forders" replace />;
  const orders = all
    .filter((o) => o.buyerId === accountId(account))
    .sort((a, b) => b.at - a.at);
  return (
    <div className="ck-page">
      <header className="ck-page-heading">
        <span className="ck-eyebrow">{translateText("ВАШ BAKEU")}</span>
        <h1>{translateText("Мои заказы")}</h1>
        <p>
          {translateText("Каждый продавец готовит свою часть заказа отдельно.")}
        </p>
      </header>
      <div className="ck-actions">
        <Link className="ck-button primary" to="/cart">
          <ShoppingBag size={16} />
          {translateText("Корзина")}
        </Link>
        <Link className="ck-button" to="/profile">
          {translateText("Мой профиль")}
        </Link>
      </div>
      <label className="ck-field">
        {translateText("Статус заказов")}
        <select
          aria-label={translateText("Статус заказов")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["Все", "Новый", "Готовится", "Доставка", "Выполнен", "Отменён"].map(
            (s) => (
              <option value={s} key={s}>
                {translateText(s)}
              </option>
            ),
          )}
        </select>
      </label>
      <p className="ck-muted">
        {translateText(
          "Это заявки из этого браузера. Для подтверждения свяжитесь с продавцом; сохранение заявки не означает её принятие.",
        )}
      </p>
      <div className="ck-order-list">
        {orders
          .filter((o) => filter === "Все" || filter === o.status)
          .map((o) => (
            <article className="ck-card" key={o.id}>
              <div className="ck-seller-heading">
                <div>
                  <small>
                    №{translateText(o.id.slice(0, 8))} ·{" "}
                    {translateText(
                      new Date(o.at).toLocaleDateString(getLocale()),
                    )}
                  </small>
                  <h2>{translateText(o.shopName || o.shopId)}</h2>
                </div>
                <span className="ck-pill">
                  {translateText(
                    o.status === "Новый" ? "Ожидает подтверждения" : o.status,
                  )}
                </span>
              </div>
              <p>
                {translateText(
                  o.items.map((p) => p.name + " × " + p.quantity).join(", "),
                )}
              </p>
              <strong>{translateText(checkoutMoney(o.total))}</strong>
              <Link className="ck-button" to={"/orders/" + o.id}>
                {translateText("Подробности и связь с продавцом")}
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
      </div>
      {!orders.some((o) => filter === "Все" || filter === o.status) && (
        <section className="ck-empty">
          <ShoppingBag size={32} />
          <h2>{translateText("Заказов пока нет")}</h2>
          <Link className="ck-button" to="/">
            {translateText("Выбрать выпечку")}
          </Link>
        </section>
      )}
    </div>
  );
}

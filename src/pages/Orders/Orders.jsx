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
        <span className="ck-eyebrow">ВАШ BAKEU</span>
        <h1>Мои заказы</h1>
        <p>Каждый продавец готовит свою часть заказа отдельно.</p>
      </header>
      <div className="ck-actions">
        <Link className="ck-button primary" to="/cart">
          <ShoppingBag size={16} />
          Корзина
        </Link>
        <Link className="ck-button" to="/profile">
          Мой профиль
        </Link>
      </div>
      <label className="ck-field">
        Статус заказов
        <select
          aria-label="Статус заказов"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["Все", "Новый", "Готовится", "Доставка", "Выполнен", "Отменён"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </label>
      <p className="ck-muted">
        Это заявки из этого браузера. Для подтверждения свяжитесь с продавцом;
        сохранение заявки не означает её принятие.
      </p>
      <div className="ck-order-list">
        {orders
          .filter((o) => filter === "Все" || filter === o.status)
          .map((o) => (
            <article className="ck-card" key={o.id}>
              <div className="ck-seller-heading">
                <div>
                  <small>
                    №{o.id.slice(0, 8)} ·{" "}
                    {new Date(o.at).toLocaleDateString("ru-RU")}
                  </small>
                  <h2>{o.shopName || o.shopId}</h2>
                </div>
                <span className="ck-pill">
                  {o.status === "Новый" ? "Ожидает подтверждения" : o.status}
                </span>
              </div>
              <p>
                {o.items.map((p) => p.name + " × " + p.quantity).join(", ")}
              </p>
              <strong>{checkoutMoney(o.total)}</strong>
              <Link className="ck-button" to={"/orders/" + o.id}>
                Подробности и связь с продавцом
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
      </div>
      {!orders.some((o) => filter === "Все" || filter === o.status) && (
        <section className="ck-empty">
          <ShoppingBag size={32} />
          <h2>Заказов пока нет</h2>
          <Link className="ck-button" to="/">
            Выбрать выпечку
          </Link>
        </section>
      )}
    </div>
  );
}

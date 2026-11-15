import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useWorkspace,
  updateOrder,
  addReview,
  replyReview,
} from "../../store/workspaceStore";
import { accountId } from "../../store/localAccount";
const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " сум";
export function Orders({ account, ownerId }) {
  const all = useWorkspace((s) => s.orders),
    reviews = useWorkspace((s) => s.reviews);
  const [notice, setNotice] = useState(""),
    [filter, setFilter] = useState("Все");
  const seller = account.role === "seller",
    orders = all.filter((o) =>
      seller ? o.shopId === ownerId : o.buyerId === accountId(account),
    );
  const transitions = {
    Новый: ["Готовится", "Отменён"],
    Готовится: ["Доставка", "Выполнен", "Отменён"],
    Доставка: ["Выполнен"],
  };
  function run(fn) {
    try {
      fn();
      setNotice("Сохранено в этом браузере.");
    } catch (e) {
      setNotice(e.message);
    }
  }
  return (
    <section className="bw-card">
      <div className="bw-heading">
        <h2>{seller ? "Заказы магазина" : "Мои заказы"}</h2>
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
      </div>
      {!seller && (
        <p>
          <Link to="/checkout" className="bw-btn primary">
            Оформить заказ из корзины
          </Link>{" "}
          <Link to="/orders" className="bw-btn">
            Все заказы
          </Link>
        </p>
      )}
      <p role="status">{notice}</p>
      {!orders.length && <p>Заказов пока нет.</p>}
      {orders
        .filter((o) => filter === "Все" || o.status === filter)
        .map((o) => (
          <article className="bw-order" key={o.id}>
            <div className="bw-heading">
              <strong>Заказ #{o.id.slice(0, 6)}</strong>
              <span className="bw-badge">{o.status}</span>
            </div>
            <small>
              {new Date(o.at).toLocaleDateString("ru-RU")} · {o.buyerName}
            </small>
            <p>
              <strong>{seller ? o.buyerName : o.shopName || o.shopId}</strong>
            </p>
            {o.items.map((p) => (
              <div className="bw-order-line" key={p.id}>
                {p.image && <img src={p.image} alt="" />}
                <span>
                  {p.name} × {p.quantity}
                </span>
                <b>{money(p.price * p.quantity)}</b>
              </div>
            ))}
            <p>
              {o.fulfillment === "pickup" ? "Самовывоз: " : "Доставка: "}
              {o.address}
            </p>
            {o.schedule && (
              <p>
                {o.schedule.date.split("-").reverse().join(".")} в{" "}
                {o.schedule.time}
              </p>
            )}
            {o.buyerPhone && seller && (
              <p>
                <a href={"tel:" + o.buyerPhone}>Позвонить: {o.buyerPhone}</a>
              </p>
            )}
            {o.note && <p>Комментарий: {o.note}</p>}
            <p>
              <Link className="bw-btn" to={"/orders/" + o.id}>
                Подробности заказа
              </Link>
            </p>
            <strong>Итого: {money(o.total)}</strong>
            {seller && (
              <div className="bw-actions">
                {(transitions[o.status] || []).map((s) => (
                  <button
                    className="bw-btn"
                    key={s}
                    onClick={() => run(() => updateOrder(ownerId, o.id, s))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {!seller &&
              o.status === "Выполнен" &&
              !reviews.some((r) => r.orderId === o.id) && (
                <ReviewForm
                  onSave={(rating, text) =>
                    addReview(account, o.id, rating, text)
                  }
                />
              )}
          </article>
        ))}
    </section>
  );
}
function ReviewForm({ onSave }) {
  const [rating, setRating] = useState(5),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onSave(rating, text);
          setText("");
        } catch (e) {
          setError(e.message);
        }
      }}
    >
      <label className="bw-field">
        Оценка
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="bw-field">
        Ваш отзыв
        <textarea
          required
          value={text}
          maxLength={1500}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <button className="bw-btn">Сохранить отзыв</button>
      <p role="alert">{error}</p>
    </form>
  );
}
export function Reviews({ account, ownerId }) {
  const reviews = useWorkspace((s) => s.reviews).filter((r) =>
    account.role === "seller"
      ? r.shopId === ownerId
      : r.buyerId === accountId(account),
  );
  const [notice, setNotice] = useState("");
  return (
    <section className="bw-card">
      <h2>Отзывы</h2>
      {!reviews.length && <p>Отзывы появятся после выполнения заказов.</p>}
      {reviews.map((r) => (
        <article className="bw-order" key={r.id}>
          <strong>
            {r.author} · {"★".repeat(r.rating)}
          </strong>
          <p>{r.text}</p>
          {r.reply && <blockquote>Ответ магазина: {r.reply}</blockquote>}
          {account.role === "seller" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  replyReview(
                    ownerId,
                    r.id,
                    new FormData(e.currentTarget).get("reply"),
                  );
                  setNotice("Ответ сохранён");
                } catch {
                  setNotice("Не удалось сохранить ответ");
                }
              }}
            >
              <label className="bw-field">
                Ответ покупателю
                <textarea
                  name="reply"
                  required
                  defaultValue={r.reply}
                  maxLength={1500}
                />
              </label>
              <button className="bw-btn">Ответить</button>
            </form>
          )}
        </article>
      ))}
      <p role="status">{notice}</p>
    </section>
  );
}
export function Sales({ ownerId }) {
  const [days, setDays] = useState(7);
  const orders = useWorkspace((s) => s.orders).filter(
    (o) => o.shopId === ownerId && o.status === "Выполнен",
  );
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - days + 1 + i);
    return {
      date: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      value: orders
        .filter((o) => new Date(o.at).toDateString() === d.toDateString())
        .reduce((n, o) => n + o.total, 0),
    };
  });
  const max = Math.max(1, ...daily.map((d) => d.value));
  return (
    <section className="bw-card">
      <div className="bw-heading">
        <h2>Статистика продаж</h2>
        <select
          aria-label="Период статистики"
          value={days}
          onChange={(e) => setDays(+e.target.value)}
        >
          <option value={7}>За 7 дней</option>
          <option value={30}>За 30 дней</option>
        </select>
      </div>
      <strong className="bw-total">
        {money(daily.reduce((n, d) => n + d.value, 0))}
      </strong>
      <p>По выполненным локальным заказам</p>
      <div className="bw-bars" role="img" aria-label="Выручка по дням">
        {daily.map((d) => (
          <div key={d.date} title={`${d.date}: ${money(d.value)}`}>
            <span style={{ height: Math.max(2, (d.value / max) * 150) }} />
            <small>{days === 7 ? d.date : ""}</small>
          </div>
        ))}
      </div>
      <details>
        <summary>Данные графика</summary>
        {daily.map((d) => (
          <p key={d.date}>
            {d.date}: {money(d.value)}
          </p>
        ))}
      </details>
    </section>
  );
}

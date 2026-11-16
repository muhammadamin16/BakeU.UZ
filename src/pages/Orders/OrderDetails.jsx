import { useLayoutEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Store } from "lucide-react";
import { getSessionProfile } from "../../store/session";
import { accountId } from "../../store/localAccount";
import { shopIdFor } from "../../store/shopStore";
import { updateOrder, useWorkspace } from "../../store/workspaceStore";
import { checkoutMoney } from "../../store/checkout";
import { useCatalog } from "../../store/sellerData";
import ProductImage from "../../components/ProductImage/ProductImage";
import SellerContact from "../Checkout/SellerContact";
import "../Checkout/Checkout.css";

const transitions = {
  Новый: ["Готовится", "Отменён"],
  Готовится: ["Доставка", "Выполнен", "Отменён"],
  Доставка: ["Выполнен"],
};
export default function OrderDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const account = getSessionProfile();
  const all = useWorkspace((s) => s.orders);
  const { shops } = useCatalog();
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  if (!account)
    return (
      <Navigate
        to={"/login?next=" + encodeURIComponent("/orders/" + id)}
        replace
      />
    );
  const ownShopId = account.role === "seller" ? shopIdFor(account) : "";
  const orders = all.filter(
    (o) =>
      (o.id === id || o.checkoutId === id) &&
      (o.buyerId === accountId(account) ||
        (ownShopId && o.shopId === ownShopId)),
  );
  const sellerView =
    orders.length > 0 &&
    orders.every(
      (o) => o.shopId === ownShopId && o.buyerId !== accountId(account),
    );
  return (
    <div className="ck-page">
      <Link className="ck-back" to={sellerView ? "/profile" : "/orders"}>
        <ArrowLeft size={17} />
        {sellerView ? "В кабинет продавца" : "Мои заказы"}
      </Link>
      {!orders.length ? (
        <section className="ck-card ck-empty">
          <h1>Заказ не найден</h1>
          <p>
            Войдите в аккаунт, в котором оформляли заказ, или проверьте номер.
          </p>
          <Link className="ck-button" to="/cart">
            В корзину
          </Link>
        </section>
      ) : (
        <>
          <header className="ck-page-heading">
            <span className="ck-eyebrow">ДЕТАЛИ ВАШЕГО ЗАКАЗА</span>
            <h1>
              {sellerView
                ? "Заказ покупателя"
                : orders.length > 1
                  ? "Ваши заявки продавцам"
                  : "Заявка продавцу"}
            </h1>
            <p>
              {sellerView
                ? "Проверьте состав, контакты и время получения. Примите заказ, когда согласуете детали с покупателем."
                : "Заявки сохранены. Передайте каждой стороне её заказ и дождитесь подтверждения продавца."}
            </p>
          </header>
          <p className="ck-notice">
            <Check size={16} />{" "}
            {sellerView
              ? "Заказ и изменения статуса сохраняются в этом браузере. Свяжитесь с покупателем по указанному телефону."
              : "Заказы и сообщения сохранены в этом браузере. SMS автоматически не отправляются — откройте подготовленный текст и отправьте его каждому продавцу."}
          </p>
          {params.get("cart") === "kept" && (
            <p className="ck-error" role="alert">
              Заявки сохранены, но очистить корзину не удалось. Не оформляйте её
              повторно — удалите заказанные товары вручную.
            </p>
          )}
          {error && (
            <p role="alert" className="ck-error">
              {error}
            </p>
          )}
          <div className="ck-receipts">
            {orders.map((order) => {
              const current = shops.find((s) => s.id === order.shopId);
              const shop = current || {
                id: order.shopId,
                name: order.shopName || order.shopId,
                phone: order.shopPhone,
              };
              const seller =
                ownShopId === order.shopId &&
                order.buyerId !== accountId(account);
              return (
                <article className="ck-card" key={order.id}>
                  <header className="ck-seller-heading">
                    <span className="ck-shop-icon">
                      <Store size={23} />
                    </span>
                    <div>
                      <small>ЗАЯВКА №{order.id.slice(0, 8)}</small>
                      <h2>{shop.name}</h2>
                    </div>
                    <span className="ck-pill">
                      {order.status === "Новый"
                        ? "Ожидает подтверждения"
                        : order.status}
                    </span>
                  </header>
                  <div className="ck-items">
                    {order.items.map((p) => (
                      <div className="ck-item" key={p.id}>
                        <ProductImage src={p.image} name={p.name} />
                        <div>
                          <strong>{p.name}</strong>
                          {p.variantLabel && <small>{p.variantLabel}</small>}
                          <small>
                            {p.quantity} × {checkoutMoney(p.price)}
                          </small>
                        </div>
                        <strong>{checkoutMoney(p.price * p.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="ck-group-total">
                    <span>Сумма за товары</span>
                    <strong>{checkoutMoney(order.total)}</strong>
                  </div>
                  <dl className="ck-receipt-meta">
                    <div>
                      <dt>Покупатель</dt>
                      <dd>
                        {order.buyerName}
                        {order.buyerPhone && (
                          <>
                            <br />
                            <a href={"tel:" + order.buyerPhone}>
                              {order.buyerPhone}
                            </a>
                          </>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Получение</dt>
                      <dd>
                        {order.fulfillment === "pickup"
                          ? "Самовывоз"
                          : "Доставка"}
                        <br />
                        {order.address}
                      </dd>
                    </div>
                    <div>
                      <dt>Дата и время</dt>
                      <dd>
                        {order.schedule
                          ? order.schedule.date.split("-").reverse().join(".") +
                            " в " +
                            order.schedule.time
                          : "Уточните у продавца"}
                      </dd>
                    </div>
                    <div>
                      <dt>Оплата</dt>
                      <dd>Напрямую продавцу. Онлайн-оплата не проводилась.</dd>
                    </div>
                  </dl>
                  {order.note && (
                    <p className="ck-notice">Комментарий: {order.note}</p>
                  )}
                  {order.fulfillment === "delivery" && (
                    <p className="ck-muted">
                      Стоимость доставки уточните у продавца: она не включена в
                      сумму товаров.
                    </p>
                  )}
                  {seller ? (
                    <div className="ck-actions">
                      {(transitions[order.status] || []).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="ck-button"
                          onClick={() => {
                            try {
                              updateOrder(ownShopId, order.id, status);
                              setError("");
                            } catch (failure) {
                              setError(failure.message);
                            }
                          }}
                        >
                          {status === "Готовится"
                            ? "Принять и готовить"
                            : status}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <SellerContact
                      shop={shop}
                      order={{ ...order, shopName: shop.name }}
                    />
                  )}
                  <details>
                    <summary className="ck-text-button">
                      История статусов
                    </summary>
                    <ol className="ck-history">
                      {(
                        order.history || [
                          { status: order.status, at: order.at },
                        ]
                      ).map((event, index) => (
                        <li key={index}>
                          <div>
                            <strong>{event.status}</strong>
                            <small>
                              {new Date(event.at).toLocaleString("ru-RU")}
                            </small>
                            {event.note}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </details>
                </article>
              );
            })}
          </div>
          <div className="ck-actions">
            <Link className="ck-button" to="/orders">
              Все мои заказы
            </Link>
            <Link className="ck-button" to="/">
              Продолжить покупки
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

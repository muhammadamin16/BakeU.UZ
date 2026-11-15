import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  AtSign,
  CalendarDays,
  CreditCard,
  Clock3,
  KeyRound,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  ShieldCheck,
  ShoppingCart,
  StickyNote,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge, Modal, PageTitle, RecordForm } from "../../components/AdminUI";
import { useAdminStore } from "../../store/adminStore";
import { AccountStatusAction } from "../../components/ManagementActions";
import HistoryTimeline from "../../components/HistoryTimeline";
import ProductPhoto from "../../components/ProductPhoto";
import { historyFor } from "../../utils/management";
import { accountFields } from "../../utils/accountFields";
import { initials } from "../../utils/accounts";
import { date, money } from "../../utils/format";
import "./AccountDetails.css";

function Field({ icon: Icon, label, children }) {
  return (
    <div className="ad-profile-field">
      <span className="ad-profile-field-icon">
        <Icon size={18} />
      </span>
      <div>
        <dt>{label}</dt>
        <dd>{children || "Не указан"}</dd>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, to }) {
  return (
    <Link
      className="ad-profile-metric"
      to={to}
      title={`Открыть: ${label.toLocaleLowerCase("ru-RU")}`}
    >
      <span className="ad-stat-icon">
        <Icon size={20} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <ArrowUpRight className="ad-metric-arrow" size={15} aria-hidden="true" />
    </Link>
  );
}

function Section({ icon: Icon, title, count, children }) {
  return (
    <section className="ad-panel">
      <div className="ad-section-heading">
        <h2>
          <Icon size={21} />
          {title}
        </h2>
        {count !== undefined && (
          <span className="ad-profile-count">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

export default function AccountDetails({ kind = "customers" }) {
  const { id } = useParams();
  const data = useAdminStore();
  const [editing, setEditing] = useState(false);
  const isSeller = kind === "sellers";
  const person = data[kind].find((row) => row.id === id);
  const listTitle = isSeller ? "Продавцы" : "Покупатели";
  const role = isSeller ? "Продавец" : "Покупатель";

  if (!person) {
    return (
      <>
        <PageTitle title={`${role} не найден`} />
        <Link className="ad-btn" to={`/admin/${kind}`}>
          <ArrowLeft size={16} />
          {listTitle}
        </Link>
      </>
    );
  }

  const shops = isSeller
    ? data.shops.filter((shop) => shop.sellerId === id)
    : [];
  const orders = data.orders.filter((order) =>
    isSeller ? order.sellerId === id : order.customerId === id,
  );
  const products = isSeller
    ? data.products.filter((row) => row.sellerId === id)
    : [];
  const subscriptions = isSeller
    ? data.subscriptions.filter((row) => row.sellerId === id)
    : [];
  const scope = { [isSeller ? "sellerId" : "customerId"]: id };
  const scopedPath = (entity, extra = {}) =>
    `/admin/${entity}?${new URLSearchParams({ ...scope, ...extra })}`;
  const events = historyFor(data, scope);
  const total = orders
    .filter((order) => order.status !== "Отменён")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  return (
    <div className="ad-account-page">
      <PageTitle title={isSeller ? "Профиль продавца" : "Профиль покупателя"}>
        <Link className="ad-btn" to={`/admin/${kind}`}>
          <ArrowLeft size={16} />
          {listTitle}
        </Link>
      </PageTitle>

      <section className="ad-panel ad-profile-hero">
        <span
          className={`ad-person-avatar ad-profile-avatar ${isSeller ? "seller" : ""}`}
          aria-hidden="true"
        >
          {initials(person.name)}
        </span>
        <div className="ad-profile-heading">
          <span className="ad-profile-overline">
            {role} · {person.id}
          </span>
          <h2>{person.name}</h2>
          <span className="ad-muted">
            {person.email || person.phone || "Контакты не указаны"}
          </span>
        </div>
        <div className="ad-profile-actions">
          <Badge>{person.status}</Badge>
          <button className="ad-btn primary" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            Редактировать профиль
          </button>
          <AccountStatusAction person={person} kind={kind} />
        </div>
      </section>

      {person.status !== "Активен" && (
        <p className="ad-restriction-note">
          <strong>{person.status}.</strong> Новые операции ограничены.{" "}
          {person.freezeReason && `Причина: ${person.freezeReason}`}
        </p>
      )}
      <div className={`ad-profile-metrics ${isSeller ? "seller" : ""}`}>
        {isSeller && (
          <Metric
            icon={Store}
            label="Магазины"
            value={shops.length}
            to={scopedPath("shops")}
          />
        )}
        {isSeller && (
          <Metric
            icon={Package}
            label="Товары"
            value={products.length}
            to={scopedPath("products")}
          />
        )}
        <Metric
          icon={ShoppingCart}
          label="Заказы"
          value={orders.length}
          to={scopedPath("orders")}
        />
        {!isSeller && (
          <Metric
            icon={ShieldCheck}
            label="Доставлено"
            to={scopedPath("orders", { status: "Доставлен" })}
            value={orders.filter((row) => row.status === "Доставлен").length}
          />
        )}
        <Metric
          icon={Wallet}
          label="Сумма без отмен"
          value={money(total)}
          to={scopedPath("orders", { excludeCancelled: "1" })}
        />
      </div>

      <div className="ad-profile-columns">
        <Section icon={UserRound} title="Личная информация">
          <dl className="ad-profile-fields">
            <Field icon={UserRound} label="Имя и фамилия">
              {person.name}
            </Field>
            <Field icon={Phone} label="Телефон">
              {person.phone && (
                <a href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}>
                  {person.phone}
                </a>
              )}
            </Field>
            <Field icon={Mail} label="Email">
              {person.email && (
                <a href={`mailto:${person.email}`}>{person.email}</a>
              )}
            </Field>
            <Field icon={MapPin} label="Адрес">
              {person.address}
            </Field>
            <Field icon={CalendarDays} label="Дата регистрации">
              {person.date ? date(person.date) : "Нет данных"}
            </Field>
            <Field icon={StickyNote} label="Заметка администратора">
              {person.notes || "Заметок пока нет"}
            </Field>
          </dl>
        </Section>

        <Section icon={ShieldCheck} title="Аккаунт и доступ">
          <dl className="ad-profile-fields">
            <Field icon={AtSign} label="Логин">
              {person.login || person.email || "Не задан"}
            </Field>
            <Field icon={UserRound} label="ID аккаунта">
              {person.id}
            </Field>
            <Field icon={ShieldCheck} label="Роль">
              {role}
            </Field>
            <Field icon={ShieldCheck} label="Статус карточки">
              <Badge>{person.status}</Badge>
            </Field>
            <Field icon={KeyRound} label="Пароль">
              Не отображается
            </Field>
          </dl>
          <div className="ad-access-note">
            <KeyRound size={18} />
            <div>
              <strong>Управление паролем</strong>
              <p>
                Карточка хранится в демо-панели. Пароли сайта здесь недоступны.
                Восстановление через email ещё не подключено.
              </p>
              <button
                className="ad-btn small"
                disabled
                title="Требуется подключение авторизации"
              >
                Сбросить пароль
              </button>
            </div>
          </div>
        </Section>
      </div>

      {isSeller && (
        <Section icon={Store} title="Магазины продавца" count={shops.length}>
          <div className="ad-profile-shops">
            {shops.map((shop) => (
              <Link
                className="ad-profile-shop"
                key={shop.id}
                to={`/admin/shops/${encodeURIComponent(shop.id)}`}
              >
                <span className="ad-notice-icon">
                  <Store size={22} />
                </span>
                <div>
                  <strong>{shop.name}</strong>
                  <span>{shop.address || "Адрес магазина не указан"}</span>
                  <small>
                    {shop.plan || "Без подписки"} · {shop.id}
                  </small>
                </div>
                <Badge>{shop.status}</Badge>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
          {!shops.length && (
            <p className="ad-empty">У продавца пока нет магазинов</p>
          )}
        </Section>
      )}

      <Section
        icon={ShoppingCart}
        title={isSeller ? "Заказы магазинов" : "Заказы покупателя"}
        count={orders.length}
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>{isSeller ? "Покупатель" : "Магазин"}</th>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      className="ad-text-link"
                      to={`/admin/orders/${encodeURIComponent(order.id)}`}
                    >
                      {order.id}{" "}
                      <ArrowUpRight
                        size={12}
                        className="ad-inline-arrow"
                        aria-hidden="true"
                      />
                    </Link>
                  </td>
                  <td>
                    {isSeller ? (
                      order.customerId ? (
                        <Link
                          className="ad-text-link"
                          to={`/admin/customers/${encodeURIComponent(order.customerId)}`}
                        >
                          {order.customer}
                        </Link>
                      ) : (
                        order.customer
                      )
                    ) : order.shopId ? (
                      <Link
                        className="ad-text-link"
                        to={`/admin/shops/${encodeURIComponent(order.shopId)}`}
                      >
                        {order.shop}
                      </Link>
                    ) : (
                      order.shop
                    )}
                  </td>
                  <td>{date(order.date)}</td>
                  <td>{money(order.total)}</td>
                  <td>
                    <Badge>{order.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length && <p className="ad-empty">Заказов пока нет</p>}
      </Section>

      {isSeller && (
        <div className="ad-profile-columns">
          <Section icon={Package} title="Товары" count={products.length}>
            {products.map((product) => (
              <Link
                className="ad-profile-list-row"
                key={product.id}
                to={`/admin/products/${encodeURIComponent(product.id)}`}
              >
                <ProductPhoto src={product.image} alt={product.name} />
                <div>
                  <strong>{product.name}</strong>
                  <small>
                    {product.shop} · {product.category}
                  </small>
                </div>
                <span>{money(product.price)}</span>
                <Badge>{product.status}</Badge>
              </Link>
            ))}
            {!products.length && <p className="ad-empty">Товаров пока нет</p>}
          </Section>
          <Section
            icon={CreditCard}
            title="Подписки"
            count={subscriptions.length}
          >
            {subscriptions.map((subscription) => (
              <Link
                className="ad-profile-list-row"
                key={subscription.id}
                to={`/admin/subscriptions/${encodeURIComponent(subscription.id)}`}
              >
                <div>
                  <strong>{subscription.plan}</strong>
                  <small>
                    {subscription.shop} · До {date(subscription.until)}
                  </small>
                </div>
                <span>{money(subscription.paid)}</span>
                <Badge>{subscription.status}</Badge>
              </Link>
            ))}
            {!subscriptions.length && (
              <p className="ad-empty">Подписок пока нет</p>
            )}
          </Section>
        </div>
      )}

      <section className="ad-panel">
        <div className="ad-section-heading">
          <h2>
            <Clock3 size={21} />
            История аккаунта
          </h2>
          <Link className="ad-btn small" to={scopedPath("history")}>
            Вся история{" "}
            <ArrowUpRight
              size={12}
              className="ad-inline-arrow"
              aria-hidden="true"
            />
          </Link>
        </div>
        <HistoryTimeline events={events.slice(0, 6)} state={data} />
      </section>
      {editing && (
        <Modal
          title={`Редактировать профиль: ${person.name}`}
          onClose={() => setEditing(false)}
        >
          <RecordForm
            key={person.id}
            fields={accountFields(kind)}
            initial={person}
            onClose={() => setEditing(false)}
            onSave={(record) => {
              data.save(kind, record);
              setEditing(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

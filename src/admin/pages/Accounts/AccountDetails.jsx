import { translateText } from "../../../i18n/index.js";
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
        <dt>{translateText(label)}</dt>
        <dd>{translateText(children || "Не указан")}</dd>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, to }) {
  return (
    <Link
      className="ad-profile-metric"
      to={to}
      title={translateText(`Открыть: ${label.toLocaleLowerCase("ru-RU")}`)}
    >
      <span className="ad-stat-icon">
        <Icon size={20} />
      </span>
      <div>
        <span>{translateText(label)}</span>
        <strong>{translateText(value)}</strong>
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
          {translateText(title)}
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
        <PageTitle title={translateText(`${role} не найден`)} />
        <Link className="ad-btn" to={`/admin/${kind}`}>
          <ArrowLeft size={16} />
          {translateText(listTitle)}
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
      <PageTitle
        title={translateText(
          isSeller ? "Профиль продавца" : "Профиль покупателя",
        )}
      >
        <Link className="ad-btn" to={`/admin/${kind}`}>
          <ArrowLeft size={16} />
          {translateText(listTitle)}
        </Link>
      </PageTitle>

      <section className="ad-panel ad-profile-hero">
        <span
          className={`ad-person-avatar ad-profile-avatar ${isSeller ? "seller" : ""}`}
          aria-hidden="true"
        >
          {initials(translateText(person.name))}
        </span>
        <div className="ad-profile-heading">
          <span className="ad-profile-overline">
            {translateText(role)} · {translateText(person.id)}
          </span>
          <h2>{translateText(person.name)}</h2>
          <span className="ad-muted">
            {translateText(
              person.email || person.phone || "Контакты не указаны",
            )}
          </span>
        </div>
        <div className="ad-profile-actions">
          <Badge>{translateText(person.status)}</Badge>
          <button className="ad-btn primary" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            {translateText("Редактировать профиль")}
          </button>
          <AccountStatusAction person={person} kind={kind} />
        </div>
      </section>

      {person.status !== "Активен" && (
        <p className="ad-restriction-note">
          <strong>{translateText(person.status)}.</strong>
          {translateText(" Новые операции ограничены.")}{" "}
          {translateText(
            person.freezeReason && `Причина: ${person.freezeReason}`,
          )}
        </p>
      )}
      <div className={`ad-profile-metrics ${isSeller ? "seller" : ""}`}>
        {isSeller && (
          <Metric
            icon={Store}
            label={translateText("Магазины")}
            value={shops.length}
            to={scopedPath("shops")}
          />
        )}
        {isSeller && (
          <Metric
            icon={Package}
            label={translateText("Товары")}
            value={products.length}
            to={scopedPath("products")}
          />
        )}
        <Metric
          icon={ShoppingCart}
          label={translateText("Заказы")}
          value={orders.length}
          to={scopedPath("orders")}
        />
        {!isSeller && (
          <Metric
            icon={ShieldCheck}
            label={translateText("Доставлено")}
            to={scopedPath("orders", { status: "Доставлен" })}
            value={orders.filter((row) => row.status === "Доставлен").length}
          />
        )}
        <Metric
          icon={Wallet}
          label={translateText("Сумма без отмен")}
          value={money(total)}
          to={scopedPath("orders", { excludeCancelled: "1" })}
        />
      </div>

      <div className="ad-profile-columns">
        <Section icon={UserRound} title={translateText("Личная информация")}>
          <dl className="ad-profile-fields">
            <Field icon={UserRound} label={translateText("Имя и фамилия")}>
              {translateText(person.name)}
            </Field>
            <Field icon={Phone} label={translateText("Телефон")}>
              {person.phone && (
                <a href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}>
                  {translateText(person.phone)}
                </a>
              )}
            </Field>
            <Field icon={Mail} label="Email">
              {person.email && (
                <a href={`mailto:${person.email}`}>
                  {translateText(person.email)}
                </a>
              )}
            </Field>
            <Field icon={MapPin} label={translateText("Адрес")}>
              {translateText(person.address)}
            </Field>
            <Field
              icon={CalendarDays}
              label={translateText("Дата регистрации")}
            >
              {translateText(person.date ? date(person.date) : "Нет данных")}
            </Field>
            <Field
              icon={StickyNote}
              label={translateText("Заметка администратора")}
            >
              {translateText(person.notes || "Заметок пока нет")}
            </Field>
          </dl>
        </Section>

        <Section icon={ShieldCheck} title={translateText("Аккаунт и доступ")}>
          <dl className="ad-profile-fields">
            <Field icon={AtSign} label={translateText("Логин")}>
              {translateText(person.login || person.email || "Не задан")}
            </Field>
            <Field icon={UserRound} label={translateText("ID аккаунта")}>
              {translateText(person.id)}
            </Field>
            <Field icon={ShieldCheck} label={translateText("Роль")}>
              {translateText(role)}
            </Field>
            <Field icon={ShieldCheck} label={translateText("Статус карточки")}>
              <Badge>{translateText(person.status)}</Badge>
            </Field>
            <Field icon={KeyRound} label={translateText("Пароль")}>
              {translateText("Не отображается")}
            </Field>
          </dl>
          <div className="ad-access-note">
            <KeyRound size={18} />
            <div>
              <strong>{translateText("Управление паролем")}</strong>
              <p>
                {translateText(
                  "Карточка хранится в демо-панели. Пароли сайта здесь недоступны. Восстановление через email ещё не подключено.",
                )}
              </p>
              <button
                className="ad-btn small"
                disabled
                title={translateText("Требуется подключение авторизации")}
              >
                {translateText("Сбросить пароль")}
              </button>
            </div>
          </div>
        </Section>
      </div>

      {isSeller && (
        <Section
          icon={Store}
          title={translateText("Магазины продавца")}
          count={shops.length}
        >
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
                  <strong>{translateText(shop.name)}</strong>
                  <span>
                    {translateText(shop.address || "Адрес магазина не указан")}
                  </span>
                  <small>
                    {translateText(shop.plan || "Без подписки")} ·{" "}
                    {translateText(shop.id)}
                  </small>
                </div>
                <Badge>{translateText(shop.status)}</Badge>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
          {!shops.length && (
            <p className="ad-empty">
              {translateText("У продавца пока нет магазинов")}
            </p>
          )}
        </Section>
      )}

      <Section
        icon={ShoppingCart}
        title={translateText(
          isSeller ? "Заказы магазинов" : "Заказы покупателя",
        )}
        count={orders.length}
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>{translateText("Заказ")}</th>
                <th>{translateText(isSeller ? "Покупатель" : "Магазин")}</th>
                <th>{translateText("Дата")}</th>
                <th>{translateText("Сумма")}</th>
                <th>{translateText("Статус")}</th>
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
                      {translateText(order.id)}{" "}
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
                          {translateText(order.customer)}
                        </Link>
                      ) : (
                        order.customer
                      )
                    ) : order.shopId ? (
                      <Link
                        className="ad-text-link"
                        to={`/admin/shops/${encodeURIComponent(order.shopId)}`}
                      >
                        {translateText(order.shop)}
                      </Link>
                    ) : (
                      order.shop
                    )}
                  </td>
                  <td>{translateText(date(order.date))}</td>
                  <td>{translateText(money(order.total))}</td>
                  <td>
                    <Badge>{translateText(order.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length && (
          <p className="ad-empty">{translateText("Заказов пока нет")}</p>
        )}
      </Section>

      {isSeller && (
        <div className="ad-profile-columns">
          <Section
            icon={Package}
            title={translateText("Товары")}
            count={products.length}
          >
            {products.map((product) => (
              <Link
                className="ad-profile-list-row"
                key={product.id}
                to={`/admin/products/${encodeURIComponent(product.id)}`}
              >
                <ProductPhoto
                  src={product.image}
                  alt={translateText(product.name)}
                />
                <div>
                  <strong>{translateText(product.name)}</strong>
                  <small>
                    {translateText(product.shop)} ·{" "}
                    {translateText(product.category)}
                  </small>
                </div>
                <span>{translateText(money(product.price))}</span>
                <Badge>{translateText(product.status)}</Badge>
              </Link>
            ))}
            {!products.length && (
              <p className="ad-empty">{translateText("Товаров пока нет")}</p>
            )}
          </Section>
          <Section
            icon={CreditCard}
            title={translateText("Подписки")}
            count={subscriptions.length}
          >
            {subscriptions.map((subscription) => (
              <Link
                className="ad-profile-list-row"
                key={subscription.id}
                to={`/admin/subscriptions/${encodeURIComponent(subscription.id)}`}
              >
                <div>
                  <strong>{translateText(subscription.plan)}</strong>
                  <small>
                    {translateText(subscription.shop)}
                    {translateText(" · До ")}
                    {translateText(date(subscription.until))}
                  </small>
                </div>
                <span>{translateText(money(subscription.paid))}</span>
                <Badge>{translateText(subscription.status)}</Badge>
              </Link>
            ))}
            {!subscriptions.length && (
              <p className="ad-empty">{translateText("Подписок пока нет")}</p>
            )}
          </Section>
        </div>
      )}

      <section className="ad-panel">
        <div className="ad-section-heading">
          <h2>
            <Clock3 size={21} />
            {translateText("История аккаунта")}
          </h2>
          <Link className="ad-btn small" to={scopedPath("history")}>
            {translateText("Вся история")}{" "}
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
          title={translateText(`Редактировать профиль: ${person.name}`)}
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

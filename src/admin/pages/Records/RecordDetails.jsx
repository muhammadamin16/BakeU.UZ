import { getLocale } from "../../../i18n/index.js";
import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Pencil,
  Package,
  ShoppingCart,
  CreditCard,
} from "lucide-react";
import { Badge, Modal, PageTitle, RecordForm } from "../../components/AdminUI";
import ProductPhoto from "../../components/ProductPhoto";
import HistoryTimeline from "../../components/HistoryTimeline";
import {
  OrderStatusActions,
  ProductStatusAction,
  SubscriptionAction,
} from "../../components/ManagementActions";
import { useAdminStore } from "../../store/adminStore";
import {
  collectionTitles,
  historyFor,
  shopRestriction,
} from "../../utils/management";
import {
  orderFields,
  productFields,
  subscriptionFields,
} from "../../utils/managementFields";
import { subscriptionStatus } from "../../utils/subscriptions";
import { date, money } from "../../utils/format";

function Information({ rows }) {
  return (
    <dl className="ad-record-information">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{translateText(label)}</dt>
          <dd>{translateText(value || "Не указано")}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function RecordDetails({ kind }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const state = useAdminStore();
  const [editing, setEditing] = useState(params.get("edit") === "1");
  const [photo, setPhoto] = useState(false);
  const record = state[kind].find((row) => row.id === id);
  const listTitle = collectionTitles[kind];
  const Icon =
    kind === "products"
      ? Package
      : kind === "orders"
        ? ShoppingCart
        : CreditCard;
  if (!record)
    return (
      <>
        <PageTitle title={translateText("Запись не найдена")} />
        <Link className="ad-btn" to={`/admin/${kind}`}>
          <ArrowLeft size={16} />
          {translateText(listTitle)}
        </Link>
      </>
    );
  const shop = state.shops.find((row) => row.id === record.shopId);
  const seller = state.sellers.find(
    (row) =>
      row.id === record.sellerId ||
      (!record.sellerId && row.id === shop?.sellerId),
  );
  const customer = state.customers.find((row) => row.id === record.customerId);
  const fields =
    kind === "products"
      ? productFields(state.shops)
      : kind === "orders"
        ? orderFields(state, record)
        : subscriptionFields(state.shops);
  const scopeKey =
    kind === "products"
      ? "productId"
      : kind === "orders"
        ? "orderId"
        : "subscriptionId";
  const events = historyFor(state, { [scopeKey]: record.id });
  const link = (entity, row, fallback) =>
    row ? (
      <Link
        className="ad-text-link"
        to={`/admin/${entity}/${encodeURIComponent(row.id)}`}
      >
        {translateText(row.name)}{" "}
        <ArrowUpRight
          size={12}
          className="ad-inline-arrow"
          aria-hidden="true"
        />
      </Link>
    ) : (
      fallback || "Нет данных"
    );
  const restriction =
    kind === "products" ? shopRestriction(state, record.shopId) : "";
  return (
    <>
      <PageTitle
        title={translateText(
          kind === "products"
            ? record.name
            : kind === "orders"
              ? `Заказ ${record.id}`
              : `Подписка ${record.id}`,
        )}
      >
        <Link className="ad-btn" to={`/admin/${kind}`}>
          <ArrowLeft size={16} />
          {translateText(listTitle)}
        </Link>
      </PageTitle>
      <section className="ad-panel ad-record-hero">
        <div className="ad-record-title">
          <span className="ad-notice-icon">
            <Icon size={23} />
          </span>
          <div>
            <span className="ad-muted">{translateText(record.id)}</span>
            <h2>
              {translateText(
                kind === "products"
                  ? record.category
                  : kind === "orders"
                    ? record.customer
                    : record.plan,
              )}
            </h2>
          </div>
          <Badge>
            {translateText(
              kind === "subscriptions"
                ? subscriptionStatus(record)
                : record.status,
            )}
          </Badge>
        </div>
        <div className="ad-inline-actions">
          <button className="ad-btn primary" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            {translateText(
              kind === "subscriptions"
                ? "Изменить / продлить"
                : "Редактировать",
            )}
          </button>
          {kind === "products" && <ProductStatusAction product={record} />}
          {kind === "orders" && <OrderStatusActions order={record} />}
          {kind === "subscriptions" && (
            <SubscriptionAction
              subscription={record}
              onRenew={() => setEditing(true)}
            />
          )}
        </div>
      </section>
      {kind === "products" && (
        <section className="ad-panel ad-product-details-grid">
          <button
            type="button"
            className="ad-photo-open"
            aria-label={translateText("Увеличить фото")}
            disabled={!record.image}
            onClick={() => setPhoto(true)}
          >
            <ProductPhoto src={record.image} alt={translateText(record.name)} />
          </button>
          <div>
            <span className="ad-record-price">
              {translateText(money(record.price))}
            </span>
            <Information
              rows={[
                ["Магазин", link("shops", shop, record.shop)],
                ["Продавец", link("sellers", seller)],
                ["Категория", record.category],
                ["Статус", record.status],
              ]}
            />
            <p className="ad-record-description">
              {translateText(record.description || "Описание не добавлено.")}
            </p>
            {restriction && (
              <p className="ad-restriction-note">
                {translateText("Для новых заказов недоступен: ")}
                {translateText(restriction.toLowerCase())}.
              </p>
            )}
          </div>
        </section>
      )}
      {kind === "orders" && (
        <>
          <section className="ad-panel">
            <Information
              rows={[
                ["Покупатель", link("customers", customer, record.customer)],
                ["Магазин", link("shops", shop, record.shop)],
                ["Продавец", link("sellers", seller)],
                ["Дата заказа", date(record.date)],
                ["Сумма", money(record.total)],
                ["Примечание", record.notes || "Нет примечаний"],
              ]}
            />
          </section>
          <section className="ad-panel">
            <div className="ad-section-heading">
              <h2>
                <Package size={21} />
                {translateText("Состав заказа")}
              </h2>
            </div>
            <div className="ad-order-items">
              {record.items?.map((line) => {
                const product = state.products.find(
                  (row) => row.id === line.productId,
                );
                return (
                  <div className="ad-order-item" key={line.productId}>
                    <ProductPhoto
                      src={line.image || product?.image}
                      alt={translateText(line.name)}
                    />
                    <div>
                      {product ? (
                        <Link
                          className="ad-text-link"
                          to={`/admin/products/${encodeURIComponent(product.id)}`}
                        >
                          {translateText(line.name)}{" "}
                          <ArrowUpRight
                            size={12}
                            className="ad-inline-arrow"
                            aria-hidden="true"
                          />
                        </Link>
                      ) : (
                        <strong>{translateText(line.name)}</strong>
                      )}
                      <small>
                        {translateText(money(line.unitPrice))} ×{" "}
                        {translateText(line.quantity)}
                        {translateText(" шт.")}
                      </small>
                    </div>
                    <strong>
                      {translateText(money(line.unitPrice * line.quantity))}
                    </strong>
                  </div>
                );
              })}
            </div>
            {!record.items?.length && (
              <p className="ad-empty">
                {translateText("Состав этого заказа не был сохранён.")}
              </p>
            )}
          </section>
        </>
      )}
      {kind === "subscriptions" && (
        <section className="ad-panel">
          <Information
            rows={[
              ["Продавец", link("sellers", seller, record.name)],
              ["Магазин", link("shops", shop, record.shop)],
              ["Тариф", record.plan],
              ["Учтённая оплата", money(record.paid)],
              ["Действует до", date(record.until)],
              ["Статус", subscriptionStatus(record)],
              ...(record.status === "Приостановлена"
                ? [
                    [
                      "Остаток срока",
                      Number(record.remainingMs) > 0
                        ? `${Math.ceil(record.remainingMs / 86400000)} дн.`
                        : "Не сохранён",
                    ],
                    [
                      "Пауза с",
                      record.pausedAt
                        ? new Date(record.pausedAt).toLocaleString(getLocale())
                        : "Нет данных",
                    ],
                  ]
                : []),
              ["Примечание", record.notes || "Нет примечаний"],
            ]}
          />
          <p className="ad-restriction-note">
            {translateText(
              "Управляет доступом в демо-панели. Банковские списания не изменяются.",
            )}
          </p>
        </section>
      )}
      <section className="ad-panel">
        <div className="ad-section-heading">
          <h2>
            <Clock3 size={21} />
            {translateText("История изменений")}
          </h2>
          <Link
            className="ad-btn small"
            to={`/admin/history?${scopeKey}=${encodeURIComponent(record.id)}`}
          >
            {translateText("Вся история")}{" "}
            <ArrowUpRight
              size={12}
              className="ad-inline-arrow"
              aria-hidden="true"
            />
          </Link>
        </div>
        <HistoryTimeline events={events.slice(0, 8)} state={state} />
      </section>
      {editing && (
        <Modal
          title={translateText(`Редактировать: ${record.name || record.id}`)}
          onClose={() => setEditing(false)}
        >
          <RecordForm
            key={record.id}
            fields={fields}
            initial={record}
            onClose={() => setEditing(false)}
            onSave={(values) => {
              state.save(kind, values);
              setEditing(false);
            }}
          />
        </Modal>
      )}
      {photo && (
        <Modal
          title={translateText("Фото товара")}
          onClose={() => setPhoto(false)}
        >
          <div className="ad-photo-preview">
            <ProductPhoto src={record.image} alt={translateText(record.name)} />
          </div>
        </Modal>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { goAccount, productImageURL } from "../../api/goAccount.js";
import { translateText as t } from "../../i18n/index.js";
import { ProductPhoto } from "../../pages/Profile/seller/ServerProducts.jsx";
import MarketModeration from "../../telegramOrders/MarketModeration.jsx";
import "./ServerWorkspace.css";

const sections = [
  ["sales", "Статистика продаж"], ["customers", "Покупатели"], ["sellers", "Продавцы"],
  ["shops", "Магазины"], ["products", "Товары"], ["orders", "Заказы"], ["moderation", "Модерация магазинов"],
  ["audit", "Журнал аудита"], ["complaints", "Жалобы"], ["plans", "Тарифы"],
  ["subscriptions", "Подписки"], ["notifications", "Уведомления"],
];
const moderationTransport = { request: goAccount?.requestWithOptions };
const periods = [["day", "День"], ["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]];
const money = (value) => Number(value).toLocaleString("ru-RU") + " UZS";
const tashkentDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tashkent" });
const settings = {
  customers: ["Имя", "Телефон", "Адрес", "Статус", "Заказы"],
  sellers: ["Имя", "Телефон", "Адрес", "Статус"],
  shops: ["Магазин", "Статус", "Адрес", "Продавец"],
  products: ["Товар", "Категория", "Цена", "Продавец", "В наличии", "Модерация"],
  orders: ["Заказ", "Покупатель", "Магазин", "Состав заказа", "Сумма", "Статус"],
  sales: ["Дата", "Товар", "Продано, шт.", "Выручка"],
  audit: ["Дата", "Действие", "Администратор", "Запись"],
  complaints: ["Жалоба", "Пользователь", "Заказ", "Статус"],
  plans: ["Тариф", "Цена", "Валюта"],
  subscriptions: ["Пользователь", "Тариф", "Статус"],
  notifications: ["Пользователь", "Уведомление", "Статус Telegram"],
};

function recordCells(section, row, refresh) {
  switch (section) {
    case "customers":
    case "sellers": {
      const account = [<AccountActions row={row} refresh={refresh} />, row.phone, row.address, row.disabled ? t("Заблокирован") : row.freezeUntil ? new Date(row.freezeUntil).toLocaleString() : t(row.status || "Активен")];
      return section === "sellers" ? account : [...account, <Link to={`?section=orders&buyer=${encodeURIComponent(row.uid)}`}>{t("Посмотреть заказы")}</Link>];
    }
    case "shops": return [row.name, t(row.status), row.address, row.sellerId];
    case "products": {
      const image = productImageURL(row.imageURLs?.[0]);
      return [<div>
        <Link className="bsa-product" to={`/product/${encodeURIComponent(row.id)}`}>
          {image && !row.draft && <img src={image} alt="" loading="lazy" />}{row.title}
        </Link>
        {!!row.imageURLs?.length && <AdminPhotos row={row} />}
      </div>, t(row.category), money(row.price), row.sellerId, t(row.available ? "Да" : "Нет"), <ProductModeration row={row} refresh={refresh} />];
    }
    case "orders": return [
      <>{row.number}<br /><time dateTime={row.createdAt}>{tashkentDate.format(new Date(row.createdAt))}</time></>,
      <>{row.buyerName || row.customerId}<br />{row.buyerPhone}</>, row.shopName || row.sellerId,
      <ul>{row.items.map((item, index) => <li key={index}>{item.title}{item.variantName ? ` · ${item.variantName}` : ""} × {item.qty}</li>)}</ul>,
      money(row.total), t(row.status),
    ];
    case "audit": return [new Date(row.at).toLocaleString(), row.kind, row.actorId, row.targetId];
    case "complaints": return [row.subject, row.userId, row.orderId, <ComplaintStatus row={row} refresh={refresh} />];
    case "plans": return [row.name, row.amount, row.currency];
    case "subscriptions": return [row.userId, row.planId, row.status];
    case "notifications": return [row.userId, row.title, row.telegramState];
    default: return [row.day, row.title, row.quantity, money(row.revenue)];
  }
}

export default function ServerWorkspace() {
  const [params, setParams] = useSearchParams();
  const section = sections.find(([key]) => key === params.get("section"))?.[0] || "sales";
  const buyer = params.get("buyer") || "";
  const page = Number(params.get("page")) || 1;
  const period = params.get("period") || "week";
  const date = params.get("date") || tashkentDate.format(new Date());
  const [account, setAccount] = useState(null);
  const [accessError, setAccessError] = useState("");
  const [revision, setRevision] = useState(0);
  const [overview, setOverview] = useState(null);
  const refresh = () => setRevision(value => value + 1);
  const [result, setResult] = useState({ path: "", data: null, error: "" });
  const path = section === "moderation" ? "" : section === "sales"
    ? `/admin/sales?${new URLSearchParams({ period, date })}`
    : `/admin/records/${section}?${new URLSearchParams({ page, ...(section === "orders" && buyer ? { buyer } : {}) })}`;

  useEffect(() => {
    const controller = new AbortController();
    goAccount.requestWithOptions("/me", { signal: controller.signal }).then((user) => {
      if (!controller.signal.aborted) setAccount(user);
    }).catch((error) => {
      if (!controller.signal.aborted) setAccessError(error.message);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!account?.capabilities?.admin || !path) return;
    const controller = new AbortController();
    goAccount.requestWithOptions(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ path, data, error: "" });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ path, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [account, path, revision]);

  useEffect(() => {
    if (!account?.capabilities?.admin) return;
    const controller = new AbortController();
    goAccount.requestWithOptions("/admin/overview", { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setOverview(data);
    }).catch(() => {});
    return () => controller.abort();
  }, [account, revision]);

  if (!account?.capabilities?.admin) return <main className="bsa-page">
    <h1>{t("Панель администратора")}</h1>
    {account || accessError ? <>
      <p role="status">{t(account ? "Для доступа войдите в аккаунт администратора." : accessError)}</p>
      <Link className="bw-btn primary" to="/login">{t("Войти")}</Link>
    </> : <p role="status">{t("Проверяем доступ…")}</p>}
    <Link to="/">{t("На главную")}</Link>
  </main>;

  const current = result.path === path ? result : null;
  const rows = current?.data?.items;
  const sales = section === "sales" && current?.data?.totals;
  const update = (values) => setParams({ section, ...(buyer ? { buyer } : {}), ...values });
  return <main className="bsa-page">
    <header>
      <div><h1>{t("Панель администратора")}</h1><p>{account.name}</p></div>
      <Link className="bw-btn" to="/profile">{t("Мой профиль")}</Link>
    </header>
    {overview && <dl className="bsa-totals">{[
      ["customers", "Покупатели"], ["sellers", "Продавцы"], ["newAccounts", "Новые за 30 дней"],
      ["activeAccounts", "Активные аккаунты"], ["shops", "Магазины"], ["products", "Товары"], ["orders", "Заказы"],
    ].map(([key, label]) => <div key={key}><dt>{t(label)}</dt><dd>{overview[key]}</dd></div>)}</dl>}
    <nav aria-label={t("Панель администратора")}>
      {sections.map(([key, label]) => <Link key={key} to={`?section=${key}`}
        aria-current={section === key ? "page" : undefined}>{t(label)}</Link>)}
    </nav>
    <section className="bsa-panel">
      <h2>{t(sections.find(([key]) => key === section)[1])}</h2>
      {section === "moderation" ? <MarketModeration transport={moderationTransport} /> : <>
        {section === "sales" && <div className="bsa-filters">
          <label>{t("Период")} <select value={period} onChange={(event) => update({ period: event.target.value, date })}>
            {periods.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
          </select></label>
          <label>{t("Дата")} <input type="date" value={date} onChange={(event) => {
            if (event.target.value) update({ period, date: event.target.value });
          }} /></label>
          {current?.data && <span>{current.data.from} — {current.data.through} · Asia/Tashkent</span>}
        </div>}
        {sales && <p className="bsa-totals">
          <span>{t("Продано, шт.")} <strong>{sales.quantity.toLocaleString("ru-RU")}</strong></span>
          <span>{t("Выручка")} <strong>{money(sales.revenue)}</strong></span>
        </p>}
        {sales && [
          ["topProducts", "Популярные товары"], ["topMarkets", "Популярные магазины"], ["weekdays", "Продажи по дням недели"],
        ].map(([key, label]) => <details key={key}><summary>{t(label)}</summary><ul>
          {current.data[key]?.map(row => <li key={row.id}>{row.title || row.id} · {money(row.revenue)}</li>)}
        </ul></details>)}
        {Number.isInteger(current?.data?.total) && <p>{t("Всего")}: {current.data.total}</p>}
        {section === "orders" && buyer && <Link to="?section=orders">{t("Показать все заказы")}</Link>}
        {!current && <p role="status">{t("Загрузка…")}</p>}
        {current?.error && <p role="alert">{t(current.error)}</p>}
        {rows?.length === 0 && <p>{t(section === "sales" ? "Нет данных за выбранный период." : "Записей нет.")}</p>}
        {rows?.length > 0 && <div className="bsa-table">
          <table><thead><tr>{settings[section].map((label) => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id || row.uid || `${row.day}:${row.productId}`}>
              {recordCells(section, row, refresh).map((value, index) => <td key={index}>{value ?? "—"}</td>)}
            </tr>)}</tbody>
          </table>
        </div>}
        {section !== "sales" && (page > 1 || current?.data?.more) && <div className="bsa-filters">
          <button type="button" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>{t("Назад")}</button>
          <span>{page}</span>
          <button type="button" disabled={!current?.data?.more} onClick={() => update({ page: page + 1 })}>{t("Далее")}</button>
        </div>}
      </>}
    </section>
  </main>;
}

function AccountActions({ row, refresh }) {
  const [data, setData] = useState(null);
  const [freezeUntil, setFreezeUntil] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/admin/users/${encodeURIComponent(row.uid)}`;
  async function update(action) {
    if (action === "freeze" && !Number.isFinite(Date.parse(freezeUntil))) return;
    if (action === "block" && !window.confirm(t("Заблокировать аккаунт?"))) return;
    setBusy(true);
    setError("");
    try {
      await goAccount.request(base + "/status", "PATCH", { action, ...(action === "freeze" && { freezeUntil: new Date(freezeUntil).toISOString() }) });
      setData(await goAccount.request(base));
      refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <details onToggle={event => {
    if (event.target.open) goAccount.request(base).then(setData).catch(failure => setError(failure.message));
  }}>
    <summary>{row.name || row.uid}</summary>
    {data && <>
      <p>{t("Мои покупки")}: {data.placedOrders} · {t("Заказы моего магазина")}: {data.incomingOrders}</p>
      {data.history?.map(event => <p key={event._id}>{event.kind} · {new Date(event.at).toLocaleString()}</p>)}
    </>}
    <label>{t("Заморозить до")} <input type="datetime-local" value={freezeUntil} onChange={event => setFreezeUntil(event.target.value)} /></label>
    <button type="button" disabled={busy || !freezeUntil} onClick={() => update("freeze")}>{t("Заморозить")}</button>
    <button type="button" disabled={busy} onClick={() => update("block")}>{t("Заблокировать")}</button>
    <button type="button" disabled={busy} onClick={() => update("unfreeze")}>{t("Восстановить доступ")}</button>
    {error && <p role="alert">{error}</p>}
  </details>;
}

function ProductModeration({ row, refresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hidden = row.moderationStatus === "hidden";
  if (row.deletedAt) return t("В архиве");
  return <>
    <button type="button" disabled={busy} onClick={async () => {
      setBusy(true);
      setError("");
      try {
        await goAccount.request(`/admin/products/${encodeURIComponent(row.id)}/status`, "PATCH", {
          status: hidden ? "approved" : "hidden", expectedStatus: hidden ? "hidden" : "approved",
        });
        refresh();
      } catch (failure) { setError(failure.message); }
      finally { setBusy(false); }
    }}>{t(hidden ? "Показать товар" : "Скрыть товар")}</button>
    {error && <p role="alert">{error}</p>}
  </>;
}

function ComplaintStatus({ row, refresh }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (row.status === "closed") return t("Закрыта");
  return <div>
    <span>{t(row.status === "reviewing" ? "На рассмотрении" : "Открыта")}</span>
    {(row.status === "open" ? ["reviewing", "closed"] : ["closed"]).map(status =>
      <button type="button" key={status} disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          await goAccount.request(`/admin/complaints/${encodeURIComponent(row.id)}/status`, "PATCH", { status });
          refresh();
        } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
      }}>{t(status === "reviewing" ? "Рассмотреть" : "Закрыть")}</button>
    )}
    {error && <p role="alert">{error}</p>}
  </div>;
}

function AdminPhotos({ row }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{t("Фотографии товара")}</summary>
    {open && row.imageURLs.map(url => <ProductPhoto key={url} product={row} url={url} api={goAccount} admin />)}
  </details>;
}

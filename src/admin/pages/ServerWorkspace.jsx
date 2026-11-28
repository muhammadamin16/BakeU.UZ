import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { accountAPI, productImageURL } from "../../api/account.js";
import { translateText as t } from "../../i18n/index.js";
import { ProductPhoto } from "../../pages/Profile/seller/ServerProducts.jsx";
import { nextStatuses, statusLabels } from "../../orders/domain.js";
import MarketModeration from "../../orders/MarketModeration.jsx";
import "./ServerWorkspace.css";

const sections = [
  ["sales", "Статистика продаж"], ["customers", "Покупатели"], ["sellers", "Продавцы"],
  ["shops", "Магазины"], ["products", "Товары"], ["orders", "Заказы"], ["moderation", "Модерация магазинов"],
  ["audit", "Журнал аудита"], ["complaints", "Жалобы"], ["plans", "Тарифы"],
  ["subscriptions", "Подписки"], ["notifications", "Уведомления"],
  ["applications", "Заявки"], ["settings", "Настройки"], ["telegram", "Telegram"],
];
const detailSections = new Set(["customers", "sellers", "shops", "products", "orders", "subscriptions"]);
const routeFor = section => "/admin/" + ({ sales: "dashboard", audit: "history" }[section] || section);
function adminRoute(pathname, params) {
  const parts = pathname.split("/").filter(Boolean).slice(1);
  const [name, id] = parts;
  const alias = { dashboard: "sales", history: "audit" };
  // Keep existing bookmarked ?section= links on the Admin index and Telegram entry.
  const section = (!name || name === "telegram") && params.get("section")
    ? params.get("section") : alias[name] || name || "sales";
  if (!sections.some(([key]) => key === section) || parts.length > 2 || (id && !detailSections.has(section))) return {};
  try { return { section, id: id && decodeURIComponent(id) }; } catch { return {}; }
}
const moderationTransport = { request: accountAPI?.requestWithOptions };
const periods = [["day", "День"], ["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]];
const money = (value) => Number(value).toLocaleString("ru-RU") + " UZS";
const tashkentDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tashkent" });
const settings = {
  customers: ["Имя", "Телефон", "Адрес", "Статус", "Заказы"],
  sellers: ["Имя", "Телефон", "Адрес", "Статус"],
  shops: ["Магазин", "Статус", "Адрес", "Продавец"],
  applications: ["Магазин", "Статус", "Адрес", "Продавец", "Модерация"],
  products: ["Товар", "Категория", "Цена", "Продавец", "В наличии", "Модерация"],
  orders: ["Заказ", "Покупатель", "Магазин", "Состав заказа", "Сумма", "Статус"],
  sales: ["Дата", "Товар", "Продано, шт.", "Выручка"],
  audit: ["Дата", "Действие", "Администратор", "Запись"],
  complaints: ["Жалоба", "Пользователь", "Заказ", "Статус"],
  plans: ["Тариф", "Цена", "Валюта"],
  subscriptions: ["Пользователь", "Тариф", "Статус"],
  notifications: ["Пользователь", "Уведомление", "Статус Telegram", "Действие"],
};

function recordCells(section, row, refresh, search) {
  const detail = (kind, label) => <Link to={{ pathname: routeFor(kind) + "/" + encodeURIComponent(row.id ?? row.uid), search }}>{label}</Link>;
  switch (section) {
    case "customers":
    case "sellers": {
      const account = [<>{detail(section, row.name || row.uid)}<AccountActions row={row} refresh={refresh} /></>, row.phone, row.address, row.disabled ? t("Заблокирован") : row.freezeUntil ? new Date(row.freezeUntil).toLocaleString() : t(row.status || "Активен")];
      return section === "sellers" ? account : [...account, <Link to={`/admin/orders?buyer=${encodeURIComponent(row.uid)}`}>{t("Посмотреть заказы")}</Link>];
    }
    case "shops": return [detail("shops", row.name), t(row.status), row.address, row.sellerId];
    case "applications": return [detail("shops", row.name), t(row.status), row.address, row.sellerId, <ShopActions row={row} refresh={refresh} />];
    case "products": {
      const image = productImageURL(row.imageURLs?.[0]);
      return [<div>
        <Link className="bsa-product" to={`/product/${encodeURIComponent(row.id)}`}>
          {image && !row.draft && <img src={image} alt="" loading="lazy" />}{row.title}
        </Link>
        {detail("products", t("Подробнее"))}
        {!!row.imageURLs?.length && <AdminPhotos row={row} />}
      </div>, t(row.category), money(row.price), row.sellerId, t(row.available ? "Да" : "Нет"), <ProductModeration row={row} refresh={refresh} />];
    }
    case "orders": return [
      <>{detail("orders", row.number)}<br /><time dateTime={row.createdAt}>{tashkentDate.format(new Date(row.createdAt))}</time></>,
      <>{row.buyerName || row.customerId}<br />{row.buyerPhone}</>, row.shopName || row.sellerId,
      <ul>{row.items.map((item, index) => <li key={index}>{item.title}{item.variantName ? ` · ${item.variantName}` : ""} × {item.qty}</li>)}</ul>,
      money(row.total), t(row.status),
    ];
    case "audit": return [new Date(row.at).toLocaleString(), row.kind, row.actorId, row.targetId];
    case "complaints": return [row.subject, row.userId, row.orderId, <ComplaintStatus row={row} refresh={refresh} />];
    case "plans": return [row.name, row.amount, row.currency];
    case "subscriptions": return [detail("subscriptions", row.userId || row.id), row.planId, row.status];
    case "notifications": return [row.userId, row.title, row.telegramState, row.adminRead ? t("Прочитано") : <NotificationRead id={row.id} refresh={refresh} />];
    default: return [row.day, row.title, row.quantity, money(row.revenue)];
  }
}

export default function ServerWorkspace() {
  const [params, setParams] = useSearchParams();
  const { pathname, search } = useLocation();
  const { section, id } = adminRoute(pathname, params);
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
  const filters = new URLSearchParams({ page });
  for (const key of ["buyer", "status", "shop", "seller", "customer", "target", "user", "kind", "q", "unread"]) {
    if (params.has(key)) filters.set(key, params.get(key));
  }
  for (const [legacy, field] of Object.entries({ sellerId: "seller", shopId: "shop", customerId: "customer", userId: "user" })) {
    if (!filters.has(field) && params.has(legacy)) filters.set(field, params.get(legacy));
  }
  if (section === "audit" && !filters.has("target")) {
    const target = ["customerId", "sellerId", "shopId", "productId", "orderId", "subscriptionId"].find(key => params.has(key));
    if (target) filters.set("target", params.get(target));
  }
  if (section === "applications" && !filters.has("status") && params.has("tab")) {
    filters.set("status", params.get("tab"));
  }
  const path = !section || section === "moderation" ? "" : id
    ? `/admin/records/${section}/${encodeURIComponent(id)}`
    : section === "settings" || section === "telegram" ? `/admin/${section}`
    : section === "sales" ? `/admin/sales?${new URLSearchParams({ period, date })}`
    : `/admin/records/${section}?${filters}`;


  useEffect(() => {
    const controller = new AbortController();
    if (!accountAPI) return;
    accountAPI.requestWithOptions("/me", { signal: controller.signal }).then((user) => {
      if (!controller.signal.aborted) setAccount(user);
    }).catch((error) => {
      if (!controller.signal.aborted) setAccessError(error.message);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!account?.capabilities?.admin || !path) return;
    const controller = new AbortController();
    accountAPI.requestWithOptions(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ path, data, error: "" });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ path, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [account, path, revision]);

  useEffect(() => {
    if (!account?.capabilities?.admin) return;
    const controller = new AbortController();
    accountAPI.requestWithOptions("/admin/overview", { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setOverview(data);
    }).catch(() => {});
    return () => controller.abort();
  }, [account, revision]);

  if (!account?.capabilities?.admin) return <main className="bsa-page">
    <h1>{t("Панель администратора")}</h1>
    {!accountAPI ? <p role="alert">{t("API администратора не настроен.")}</p> : account || accessError ? <>
      <p role="alert">{t(account ? "Для доступа войдите в аккаунт администратора." : accessError)}</p>
      <Link className="bw-btn primary" to="/login">{t("Войти")}</Link>
    </> : <p role="status">{t("Проверяем доступ…")}</p>}
    <Link to="/">{t("На главную")}</Link>
  </main>;

  const current = result.path === path ? result : null;
  const rows = current?.data?.items;
  const sales = section === "sales" && current?.data?.totals;
  const update = values => setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [key, value] of Object.entries(values)) next.set(key, value);
    return next;
  });
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
      {sections.map(([key, label]) => <Link key={key} to={routeFor(key)}
        aria-current={section === key ? "page" : undefined}>{t(label)}</Link>)}
    </nav>
    <section className="bsa-panel">
      <h2>{t(sections.find(([key]) => key === section)?.[1] || "Страница не найдена")}</h2>
      {!section ? <p role="alert">{t("Страница не найдена")}</p> : id || section === "settings" || section === "telegram" ? <>
        {!current && <p role="status">{t("Загрузка…")}</p>}
        {current?.error && <p role="alert">{t(current.error)}</p>}
        {current?.data && (section === "settings" ? <AdminPreferences key={path} initial={current.data} refresh={refresh} /> :
          section === "telegram" ? <TelegramStatus data={current.data} /> :
          <AdminRecord key={path} row={current.data} section={section} search={search} tab={params.get("tab")} refresh={refresh} />)}
      </> :
      section === "moderation" ? <MarketModeration transport={moderationTransport} /> : <>
        {section === "notifications" && <div className="bsa-filters">
          <Link to={{ pathname, search: "?" + new URLSearchParams({ ...Object.fromEntries(params), unread: params.get("unread") === "1" ? "0" : "1", page: "1" }) }}>
            {t(params.get("unread") === "1" ? "Все уведомления" : "Непрочитанные уведомления")}</Link>
          <NotificationRead refresh={refresh} />
        </div>}
        {section === "sales" && overview?.unreadNotifications != null &&
          <p><Link to="/admin/notifications?unread=1">{t("Непрочитанные уведомления")}: {overview.unreadNotifications}</Link></p>}
        {section === "applications" && <label>{t("Статус")} <select value={filters.get("status") || "pending"}
          onChange={event => update({ status: event.target.value, page: 1 })}>
          {["pending", "approved", "rejected", "suspended", "all"].map(status => <option key={status} value={status}>{t(status)}</option>)}
        </select></label>}
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
        {section === "orders" && buyer && <Link to="/admin/orders">{t("Показать все заказы")}</Link>}
        {!current && <p role="status">{t("Загрузка…")}</p>}
        {current?.error && <p role="alert">{t(current.error)}</p>}
        {rows?.length === 0 && <p>{t(section === "sales" ? "Нет данных за выбранный период." : "Записей нет.")}</p>}
        {rows?.length > 0 && <div className="bsa-table">
          <table><thead><tr>{settings[section].map((label) => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id || row.uid || `${row.day}:${row.productId}`}>
              {recordCells(section, row, refresh, search).map((value, index) => <td key={index}>{value ?? "—"}</td>)}
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

function AccountActions({ row, refresh, initial }) {
  const [data, setData] = useState(initial ?? null);
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
      await accountAPI.request(base + "/status", "PATCH", { action, ...(action === "freeze" && { freezeUntil: new Date(freezeUntil).toISOString() }) });
      setData(await accountAPI.request(base));
      refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <details open={initial ? true : undefined} onToggle={event => {
    if (!initial && event.target.open) accountAPI.request(base).then(setData).catch(failure => setError(failure.message));
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
        await accountAPI.request(`/admin/products/${encodeURIComponent(row.id)}/status`, "PATCH", {
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
          await accountAPI.request(`/admin/complaints/${encodeURIComponent(row.id)}/status`, "PATCH", { status });
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
    {open && row.imageURLs.map(url => <ProductPhoto key={url} product={row} url={url} api={accountAPI} admin />)}
  </details>;
}

const detailFields = {
  customers: [["Имя", "name"], ["Телефон", "phone"], ["Адрес", "address"]],
  sellers: [["Имя", "name"], ["Телефон", "phone"], ["Адрес", "address"]],
  shops: [["Магазин", "name"], ["Описание", "description"], ["Адрес", "address"], ["Продавец", "sellerId"]],
  products: [["Товар", "title"], ["Описание", "description"], ["Категория", "category"], ["Цена", "price"], ["Продавец", "sellerId"]],
  orders: [["Заказ", "number"], ["Покупатель", "customerId"], ["Магазин", "shopName"], ["Сумма", "total"], ["Адрес", "deliveryAddress"]],
  subscriptions: [["Пользователь", "userId"], ["Тариф", "planId"], ["Срок действия", "expiresAt"]],
};

function AdminRecord({ row, section, search, tab, refresh }) {
  const account = section === "customers" || section === "sellers";
  const title = row.name || row.title || row.number || row.id;
  const status = row.status ?? row.moderationStatus;
  return <article aria-label={title} data-record-id={row.id}>
    <Link to={{ pathname: routeFor(section), search }}>{t("Назад")}</Link>
    <h3>{title}</h3>
    <p>{row.id}{status && " · " + t(status)}</p>
    <dl className="bsa-totals">{detailFields[section].map(([label, key]) =>
      <div key={key}><dt>{t(label)}</dt><dd>{row[key] ?? "—"}</dd></div>)}</dl>
    {account && <AdminAccountRecord row={row} refresh={refresh} />}
    {section === "shops" && <ShopActions row={row} refresh={refresh} />}
    {section === "products" && <>
      {!!row.imageURLs?.length && <AdminPhotos row={row} />}
      <ProductModeration row={row} refresh={refresh} />
    </>}
    {section === "orders" && <>
      <OrderActions row={row} refresh={refresh} />
      <ul>{(row.items ?? []).map((item, index) =>
        <li key={index}>{item.title} × {item.qty}</li>)}</ul>
      <details open={tab === "history" ? true : undefined}><summary>{t("Журнал аудита")}</summary>
        <ul>{(row.history ?? []).map((event, index) =>
          <li key={index}>{t(event.to || event.status || event.kind || "")}</li>)}</ul>
      </details>
    </>}
  </article>;
}

function AdminAccountRecord({ row, refresh }) {
  const [profile, setProfile] = useState();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    accountAPI.requestWithOptions(`/admin/users/${encodeURIComponent(row.id)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setProfile(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [row.id]);
  return profile ? <AccountActions row={{ ...row, uid: row.id }} initial={profile} refresh={refresh} /> :
    error ? <p role="alert">{error}</p> : <p role="status">{t("Загрузка…")}</p>;
}

function ShopActions({ row, refresh }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = {
    pending: [["approved", "Одобрить"], ["rejected", "Отклонить"]],
    approved: [["suspended", "Приостановить магазин"]],
    suspended: [["approved", "Возобновить магазин"]],
  }[row.status];
  if (!options) return null;
  async function change(status) {
    setBusy(true);
    setError("");
    try {
      await accountAPI.request(`/admin/markets/${encodeURIComponent(row.id)}/status`, "PATCH", {
        status, expectedStatus: row.status, reason,
      });
      setReason("");
      refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="bsa-filters">
    <label>{t("Причина изменения")} <input maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {options.map(([status, label]) => <button key={status} type="button" disabled={busy || !reason.trim()} onClick={() => change(status)}>{t(label)}</button>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}

function AdminPreferences({ initial, refresh }) {
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState({});
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setResult({});
    try {
      const saved = await accountAPI.request("/admin/settings", "PUT", form);
      setForm(saved);
      setResult({ saved: true });
      refresh();
    } catch (failure) { setResult({ error: failure.message }); }
    finally { setBusy(false); }
  }
  return <form className="bsa-settings" onSubmit={save}>
    <fieldset disabled={busy}>
      {[["name", "Имя"], ["email", "Email"], ["site", "Название сайта"]].map(([key, label]) =>
        <label key={key}>{t(label)}<input type={key === "email" ? "email" : "text"} value={form[key]}
          onChange={event => { setForm({ ...form, [key]: event.target.value }); setResult({}); }} /></label>)}
      <label><input type="checkbox" checked={form.notifications}
        onChange={event => { setForm({ ...form, notifications: event.target.checked }); setResult({}); }} />
        {t("Показывать уведомления на обзоре")}</label>
      <button className="bw-btn primary">{t("Сохранить изменения")}</button>
    </fieldset>
    {result.saved && <p role="status">{t("Настройки сохранены")}</p>}
    {result.error && <p role="alert">{result.error}</p>}
  </form>;
}

function TelegramStatus({ data }) {
  return <dl className="bsa-totals">
    <div><dt>{t("Подключено к боту")}</dt><dd>{data.botStarted}</dd></div>
    {data.deliveries.map(row => <div key={row.state}><dt>{t(row.state)}</dt><dd>{row.total}</dd></div>)}
  </dl>;
}

function OrderActions({ row, refresh }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = nextStatuses(row.status, row.fulfillment);
  if (row.workflowVersion !== 2 || !options.length) return null;
  async function change(status) {
    setError("");
    setBusy(true);
    try {
      await accountAPI.requestWithOptions(`/admin/orders/${encodeURIComponent(row.id)}/status`, {
        method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() },
        body: { status, expectedStatus: row.status, expectedVersion: row.version },
      });
      refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="bsa-filters">
    {options.map(status => <button key={status} disabled={busy} onClick={() => change(status)}>{t(statusLabels[status])}</button>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}

function NotificationRead({ id, refresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function read() {
    setBusy(true);
    setError("");
    try {
      await accountAPI.request("/admin/notifications/read", "PATCH", id ? { id } : {});
      refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" disabled={busy} onClick={read}>{t(id ? "Отметить прочитанным" : "Отметить все прочитанными")}</button>
    {error && <p role="alert">{error}</p>}
  </>;
}

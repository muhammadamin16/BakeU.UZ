import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { goAccount, productImageURL } from "../../api/goAccount.js";
import { translateText as t } from "../../i18n/index.js";
import MarketModeration from "../../telegramOrders/MarketModeration.jsx";
import "./ServerWorkspace.css";

const sections = [
  ["sales", "Статистика продаж"], ["customers", "Покупатели"], ["sellers", "Продавцы"],
  ["shops", "Магазины"], ["products", "Товары"], ["orders", "Заказы"], ["moderation", "Модерация магазинов"],
];
const moderationTransport = { request: goAccount?.requestWithOptions };
const periods = [["day", "День"], ["week", "Неделя"], ["month", "Месяц"]];
const money = (value) => Number(value).toLocaleString("ru-RU") + " UZS";
const tashkentDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tashkent" });
const settings = {
  customers: ["Имя", "Email", "Телефон", "Адрес", "Заказы"],
  sellers: ["Имя", "Email", "Телефон", "Адрес"],
  shops: ["Магазин", "Статус", "Адрес", "Продавец"],
  products: ["Товар", "Категория", "Цена", "Продавец", "В наличии"],
  orders: ["Заказ", "Покупатель", "Магазин", "Состав заказа", "Сумма", "Статус"],
  sales: ["Дата", "Товар", "Продано, шт.", "Выручка"],
};

function recordCells(section, row) {
  switch (section) {
    case "customers":
    case "sellers": {
      const account = [row.name, row.email, row.phone, row.address];
      return section === "sellers" ? account : [...account, <Link to={`?section=orders&buyer=${encodeURIComponent(row.uid)}`}>{t("Посмотреть заказы")}</Link>];
    }
    case "shops": return [row.name, t(row.status), row.address, row.sellerId];
    case "products": {
      const image = productImageURL(row.imageURLs?.[0]);
      return [<Link className="bsa-product" to={`/product/${encodeURIComponent(row.id)}`}>
        {image && <img src={image} alt="" loading="lazy" />}{row.title}
      </Link>, t(row.category), money(row.price), row.sellerId, t(row.available ? "Да" : "Нет")];
    }
    case "orders": return [
      <>{row.number}<br /><time dateTime={row.createdAt}>{tashkentDate.format(new Date(row.createdAt))}</time></>,
      <>{row.buyerName || row.customerId}<br />{row.buyerPhone}</>, row.shopName || row.sellerId,
      <ul>{row.items.map((item, index) => <li key={index}>{item.title}{item.variantName ? ` · ${item.variantName}` : ""} × {item.qty}</li>)}</ul>,
      money(row.total), t(row.status),
    ];
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
  }, [account, path]);

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
  const sales = section === "sales" && rows?.reduce((total, row) => ({
    quantity: total.quantity + row.quantity, revenue: total.revenue + row.revenue,
  }), { quantity: 0, revenue: 0 });
  const update = (values) => setParams({ section, ...(buyer ? { buyer } : {}), ...values });
  return <main className="bsa-page">
    <header>
      <div><h1>{t("Панель администратора")}</h1><p>{account.name}</p></div>
      <Link className="bw-btn" to="/profile">{t("Мой профиль")}</Link>
    </header>
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
        {section === "orders" && buyer && <Link to="?section=orders">{t("Показать все заказы")}</Link>}
        {!current && <p role="status">{t("Загрузка…")}</p>}
        {current?.error && <p role="alert">{t(current.error)}</p>}
        {rows?.length === 0 && <p>{t(section === "sales" ? "Нет данных за выбранный период." : "Записей нет.")}</p>}
        {rows?.length > 0 && <div className="bsa-table">
          <table><thead><tr>{settings[section].map((label) => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id || row.uid || `${row.day}:${row.productId}`}>
              {recordCells(section, row).map((value, index) => <td key={index}>{value ?? "—"}</td>)}
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

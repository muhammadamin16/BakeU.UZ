import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { products, shops } from "../../store/sellerData.js";
import { translateText as t } from "../../i18n/index.js";
import "./ServerWorkspace.css";

const sections = [
  ["dashboard", "Обзор"], ["products", "Товары"], ["shops", "Магазины"],
  ["customers", "Покупатели"], ["sellers", "Продавцы"], ["orders", "Заказы"],
];
const buyers = [{ id: "preview-buyer", name: "Демо-покупатель", phone: "+998 XX XXX XX XX" }];
const money = value => Number(value).toLocaleString("ru-RU") + " сум";

// A read-only UI prototype. It never creates an account, calls Admin APIs or
// grants Backend permissions. Server mode renders ServerWorkspace instead.
export default function FrontendAdmin() {
  const { pathname } = useLocation();
  const section = pathname.split("/")[2] || "dashboard";
  const [query, setQuery] = useState("");
  const filter = rows => rows.filter(row => String(row.name || row.id).toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  const productRows = filter(products);
  const shopRows = filter(shops);
  const title = sections.find(([key]) => key === section)?.[1] || "Предпросмотр Admin";
  return <main className="bsa-page">
    <header>
      <div><h1>{t("Панель администратора")}</h1><p>Frontend demo · {t("Только макет, без доступа к реальным аккаунтам и данным.")}</p></div>
      <Link className="bw-btn" to="/">{t("На главную")}</Link>
    </header>
    <nav aria-label={t("Панель администратора")}>
      {sections.map(([key, label]) => <Link key={key} to={"/admin/" + key} aria-current={section === key ? "page" : undefined}>{t(label)}</Link>)}
    </nav>
    <section className="bsa-panel">
      <h2>{t(title)}</h2>
      {section === "dashboard" ? <>
        <dl className="bsa-totals">
          {[["Демо-товары", products.length], ["Демо-магазины", shops.length], ["Демо-покупатели", buyers.length]].map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}
        </dl>
        <p>{t("Откройте разделы, чтобы проверить таблицы и поиск. Управление реальными данными подключим вместе с Backend.")}</p>
      </> : ["products", "shops", "customers", "sellers"].includes(section) ? <>
        <label className="bsa-filters">{t("Поиск")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="bsa-table"><table>
          <thead><tr>{(section === "products" ? ["Товар", "Магазин", "Категория", "Цена"] : section === "customers" ? ["Покупатель", "Телефон", "Статус"] : ["Магазин", "Адрес", "Статус"]).map(label => <th key={label}>{t(label)}</th>)}</tr></thead>
          <tbody>
            {section === "products" ? productRows.map(product => <tr key={product.id}>
              <td><Link className="bsa-product" to={"/product/" + product.id}><img src={product.image} alt="" />{t(product.name)}</Link></td>
              <td>{shops.find(shop => shop.id === product.shopId)?.name}</td><td>{t(product.category)}</td><td>{money(product.price)}</td>
            </tr>) : section === "customers" ? filter(buyers).map(buyer => <tr key={buyer.id}><td>{t(buyer.name)}</td><td>{buyer.phone}</td><td>Demo</td></tr>) : shopRows.map(shop => <tr key={shop.id}><td><Link to={"/seller?shop=" + shop.id}>{shop.name}</Link></td><td>{t(shop.address)}</td><td>Demo</td></tr>)}
          </tbody>
        </table></div>
      </> : <p>{t("Реальных записей пока нет. Этот раздел подключим после Backend.")}</p>}
    </section>
  </main>;
}

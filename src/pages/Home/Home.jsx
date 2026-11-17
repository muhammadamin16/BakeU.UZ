import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, MapPin, Plus, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { getLocale, translateText } from "../../i18n/index.js";
import TopBanner from "../../components/TopBanner/TopBanner.jsx";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import { demoProducts, demoSubscriptions, eligibleProducts } from "../../store/homeData";
import { useCartStore } from "../../store/cartStore";
import "./Home.css";

const CATEGORIES = [
  { name: "Все", icon: "✦" },
  { name: "Торты", icon: "🍰" },
  { name: "Печенье", icon: "🍪" },
  { name: "Хлеб", icon: "🥖" },
  { name: "Самса", icon: "🥟" },
];

const MAKERS = [
  { id: "shahzoda", name: "Shahzoda Family", description: "Торты для особенных моментов", image: "/images/products/cake.jpg", initials: "SF" },
  { id: "sweet-home", name: "Sweet Home", description: "Печенье и сладости к чаю", image: "/images/products/cookie.jpg", initials: "SH" },
  { id: "bakeu", name: "BakeU Bakery", description: "Домашний хлеб и ароматная самса", image: "/images/products/bread.jpg", initials: "BU" },
];

function ProductCard({ product, quantity, onAdd }) {
  const productUrl = `/product/${encodeURIComponent(product.id)}`;
  const sellerUrl = `/profile?shop=${encodeURIComponent(product.sellerId ?? "")}`;

  return (
    <article className="bu-product">
      <div className="bu-product__image" style={{ backgroundColor: product.color || "#f1e8dc" }}>
        <Link className="bu-product__image-link" to={productUrl} aria-label={translateText(`Подробнее: ${product.name}`)}>
          <img src={product.image} alt={translateText(product.name)} loading="lazy" decoding="async" />
        </Link>
        <div className="bu-product__favorite"><FavoriteButton product={product} /></div>
        {quantity > 0 && (
          <span className="bu-product__quantity"><Check size={13} aria-hidden="true" /> {translateText("В корзине:")} {quantity}</span>
        )}
      </div>
      <div className="bu-product__body">
        <div className="bu-product__meta">
          <Link to={sellerUrl} className="bu-shop-link">{translateText(product.sellerName || "BakeU")}</Link>
          <span className="bu-product__category">{translateText(product.category || "")}</span>
        </div>
        <h3><Link to={productUrl}>{translateText(product.name)}</Link></h3>
        <div className="bu-product__bottom">
          <span className="bu-product__price">
            {Number(product.price || 0).toLocaleString(getLocale())}
            <small>{translateText("сум")}</small>
          </span>
          <button className="bu-product__add" type="button" onClick={() => onAdd(product)} aria-label={translateText(`Добавить в корзину: ${product.name}`)}>
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Home({ catalog = demoProducts, subscriptions = demoSubscriptions }) {
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState("");
  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const featured = useMemo(() => eligibleProducts(catalog, subscriptions, now), [catalog, subscriptions, now]);
  const visibleProducts = useMemo(() => {
    const normalized = normalizeSearch(query.trim());
    return featured.filter((product) => {
      const matchesCategory = category === "Все" || product.category === category;
      const searchable = normalizeSearch(`${product.name || ""} ${translateText(product.name || "")} ${product.sellerName || ""}`);
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
  }, [featured, category, query]);

  const resetFilters = () => { setQuery(""); setCategory("Все"); };
  const scrollToProducts = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    document.getElementById("home-catalog")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };
  const openCatalog = (nextCategory = "Все") => {
    setQuery("");
    setCategory(CATEGORIES.some((item) => item.name === nextCategory) ? nextCategory : "Все");
    window.requestAnimationFrame(scrollToProducts);
  };
  const handleAdd = (product) => {
    add(product);
    setNotice(`${translateText("Добавлено в корзину:")} ${translateText(product.name)}`);
  };
  const isFiltered = query.trim() !== "" || category !== "Все";

  return (
    <main className="bu-home">
      <TopBanner onCategoryClick={openCatalog} />

      <Link to="/map" className="bu-map">
        <span className="bu-map__icon"><MapPin size={21} aria-hidden="true" /></span>
        <span className="bu-map__text">
          <strong>{translateText("Вкусное ближе, чем кажется")}</strong>
          <span>{translateText("Откройте карту и найдите мастеров рядом")}</span>
        </span>
        <span className="bu-map__action">{translateText("Открыть карту")} <ArrowUpRight size={19} aria-hidden="true" /></span>
      </Link>

      <section id="home-catalog" className="bu-catalog" aria-labelledby="bu-catalog-title">
        <div className="bu-catalog__top">
          <div className="bu-catalog__heading">
            <span className="bu-overline">BAKEU COLLECTION</span>
            <h2 id="bu-catalog-title">{translateText("Топ товары")}</h2>
            <Link className="bu-all-products" to="/seller?tab=products">
              {translateText("Смотреть все товары")} <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <label className="bu-search">
            <Search size={19} aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={translateText("Торт, печенье, хлеб…")} aria-label={translateText("Поиск товаров")} />
            {query && <button type="button" onClick={() => setQuery("")} aria-label={translateText("Очистить поиск")}><X size={17} /></button>}
          </label>
        </div>

        <div className="bu-categories" role="group" aria-label={translateText("Категории товаров")}>
          {CATEGORIES.map((item) => {
            const count = item.name === "Все" ? featured.length : featured.filter((p) => p.category === item.name).length;
            return (
              <button key={item.name} type="button" className={`bu-category${category === item.name ? " is-active" : ""}`} aria-pressed={category === item.name} onClick={() => setCategory(item.name)}>
                <span className="bu-category__emoji" aria-hidden="true">{item.icon}</span>
                {translateText(item.name)}
                <span className="bu-category__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="bu-results">
          <span>{translateText(isFiltered ? "Найдено товаров" : "Всего товаров")}: <strong>{visibleProducts.length}</strong></span>
          {isFiltered && <button type="button" onClick={resetFilters}>{translateText("Сбросить фильтры")} <X size={14} /></button>}
        </div>

        {visibleProducts.length ? (
          <div className="bu-products">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} quantity={items?.[product.id] ?? 0} onAdd={handleAdd} />
            ))}
          </div>
        ) : (
          <div className="bu-empty">
            <Search size={28} aria-hidden="true" />
            <h3>{translateText("Пока ничего не нашли")}</h3>
            <p>{translateText("Попробуйте другое название или выберите все категории.")}</p>
            <button className="bu-button bu-button--primary" type="button" onClick={resetFilters}>{translateText("Сбросить фильтры")}</button>
          </div>
        )}
        <div className={`bu-notice${notice ? " is-visible" : ""}`} role="status" aria-live="polite" aria-atomic="true">
          {notice && <><ShoppingBag size={17} aria-hidden="true" /><span>{notice}</span></>}
        </div>
      </section>

      <section className="bu-makers" aria-labelledby="bu-makers-title">
        <div className="bu-makers__heading">
          <div><span className="bu-overline">MADE WITH LOVE</span><h2 id="bu-makers-title">{translateText("Знакомьтесь, кондитеры")}</h2></div>
          <Link to="/seller?tab=sellers">{translateText("Все продавцы")} <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="bu-makers__grid">
          {MAKERS.map((shop) => (
            <Link key={shop.id} className="bu-maker" to={`/profile?shop=${encodeURIComponent(shop.id)}`} aria-label={translateText(`Открыть профиль: ${shop.name}`)}>
              <div className="bu-maker__photo"><img src={shop.image} alt="" loading="lazy" decoding="async" /></div>
              <div className="bu-maker__info"><span className="bu-maker__avatar">{shop.initials}</span><strong>{shop.name}</strong><span>{translateText(shop.description)}</span><small>{translateText("Открыть профиль")} <ArrowUpRight size={13} /></small></div>
            </Link>
          ))}
        </div>
      </section>

      <Link to="/ai" className="bu-helper">
        <span className="bu-helper__icon"><Sparkles size={24} aria-hidden="true" /></span>
        <span className="bu-helper__text"><strong>{translateText("Не знаете, что выбрать?")}</strong><small>{translateText("Расскажите помощнику BakeU, чего хочется сегодня.")}</small></span>
        <span className="bu-helper__action">{translateText("Спросить помощника")} <ArrowRight size={19} aria-hidden="true" /></span>
      </Link>
    </main>
  );
}

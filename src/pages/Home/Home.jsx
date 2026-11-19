import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Check,
  MapPin, Plus, Search, ShoppingBag, Sparkles, X,
} from "lucide-react";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { getLocale, matchesLocalizedSearch, translateText } from "../../i18n/index.js";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import { demoProducts, demoSubscriptions, eligibleProducts } from "../../store/homeData";
import { useCartStore } from "../../store/cartStore";
import "./Home.css";

const PAGE_SIZE = 8;
const CATEGORIES = ["Все", "Торты", "Печенье", "Хлеб", "Самса"];
const MAKERS = [
  { id: "shahzoda", name: "Shahzoda Family", description: "Торты для особенных моментов.", image: "/images/products/cake.jpg" },
  { id: "sweet-home", name: "Sweet Home", description: "Печенье и сладости к чаю", image: "/images/products/cookie.jpg" },
  { id: "bakeu", name: "BakeU Bakery", description: "Домашний хлеб и ароматная самса", image: "/images/products/bread.jpg" },
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
        <FavoriteButton product={product} />
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
            {Number(product.price || 0).toLocaleString(getLocale())} <small>{translateText("сум")}</small>
          </span>
          <button className="bu-product__add" type="button" onClick={() => onAdd(product)} aria-label={translateText(`Добавить в корзину: ${product.name}`)}>
            <Plus size={17} aria-hidden="true" /> {translateText("Добавить")}
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
  const [notice, setNotice] = useState(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const catalogRef = useRef(null);
  const searchRef = useRef(null);
  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const featured = useMemo(
    () => eligibleProducts(catalog, subscriptions, now),
    [catalog, subscriptions, now]
  );
  const visibleProducts = useMemo(() => {
    const normalized = normalizeSearch(query.trim());
    return featured.filter((product) => {
      const matchesCategory = category === "Все" || product.category === category;
      return matchesCategory && (!normalized || matchesLocalizedSearch(normalized, product.name, product.sellerName));
    });
  }, [featured, category, query]);

  const displayedProducts = visibleProducts.slice(0, limit);
  const remaining = Math.max(0, visibleProducts.length - displayedProducts.length);
  const isFiltered = query.trim() !== "" || category !== "Все";
  const expanded = limit > PAGE_SIZE;

  const updateQuery = (value) => {
    setQuery(value);
    setLimit(PAGE_SIZE);
  };
  const updateCategory = (value) => {
    setCategory(value);
    setLimit(PAGE_SIZE);
  };

  const scrollToProducts = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    catalogRef.current?.focus({ preventScroll: true });
    catalogRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };
  const resetFilters = () => {
    updateQuery("");
    setCategory("Все");
    searchRef.current?.focus();
  };
  const handleAdd = (product) => {
    add(product);
    setNotice({ name: product.name });
  };
  const collapseProducts = () => {
    setLimit(PAGE_SIZE);
    window.requestAnimationFrame(scrollToProducts);
  };

  return (
    <div className="bu-home">
      <section className="bu-welcome" aria-labelledby="bu-welcome-title">
        <div className="bu-welcome__copy">
          <h1 id="bu-welcome-title">{translateText("Свежая выпечка к вашему столу")}</h1>
          <p>{translateText("Выбирайте торты, хлеб и домашнюю выпечку от местных пекарей.")}</p>
          <div className="bu-welcome__actions">
            <button type="button" className="bu-welcome__browse" onClick={scrollToProducts}>
              {translateText("Смотреть каталог")} <ArrowDown size={18} aria-hidden="true" />
            </button>
            <Link to="/map" className="bu-map">
              <MapPin size={18} aria-hidden="true" /> {translateText("Открыть карту")}
            </Link>
          </div>
        </div>
        <div className="bu-welcome__photo">
          <picture>
            <source media="(max-width: 600px)" srcSet="/images/banners/winter-bakery-small.webp" />
            <img src="/images/banners/winter-bakery.webp" alt="" fetchPriority="high" />
          </picture>
        </div>
      </section>

      <section id="home-catalog" ref={catalogRef} tabIndex={-1} className="bu-catalog" aria-labelledby="bu-catalog-title">
        <div className="bu-catalog__top">
          <div className="bu-catalog__heading">
            <h2 id="bu-catalog-title">{translateText("Каталог выпечки")}</h2>
            <Link className="bu-all-products" to="/seller?tab=products">
              {translateText("Смотреть все товары")} <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="bu-search" role="search">
            <Search size={19} aria-hidden="true" />
            <input ref={searchRef} type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={translateText("Торт, печенье, хлеб…")} aria-label={translateText("Поиск товаров")} />
            {query && <button type="button" onClick={() => { updateQuery(""); searchRef.current?.focus(); }} aria-label={translateText("Очистить поиск")}><X size={17} aria-hidden="true" /></button>}
          </div>
        </div>

        <div className="bu-categories" role="group" aria-label={translateText("Категории товаров")}>
          {CATEGORIES.map((item) => {
            const count = item === "Все" ? featured.length : featured.filter((p) => p.category === item).length;
            return (
              <button key={item} type="button" className={`bu-category${category === item ? " is-active" : ""}`} aria-pressed={category === item} onClick={() => updateCategory(item)}>
                {translateText(item)} <span className="bu-category__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="bu-results">
          <span>{translateText(isFiltered ? "Найдено товаров" : "Всего товаров")}: <strong>{visibleProducts.length}</strong></span>
          {isFiltered && <button type="button" onClick={resetFilters}>{translateText("Сбросить фильтры")} <X size={14} aria-hidden="true" /></button>}
        </div>

        {visibleProducts.length > 0 ? (
          <>
            <div className="bu-products">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} quantity={items?.[product.id] ?? 0} onAdd={handleAdd} />
              ))}
            </div>

            {(remaining > 0 || expanded) && (
              <div className="bu-load-more">
                <p className="bu-load-more__label">
                  {translateText(`Показано ${displayedProducts.length} из ${visibleProducts.length} товаров`)}
                </p>
                <div className="bu-load-more__track" role="progressbar" aria-label={translateText("Показано товаров")} aria-valuemin={0} aria-valuemax={visibleProducts.length} aria-valuenow={displayedProducts.length}>
                  <span style={{ width: `${(displayedProducts.length / visibleProducts.length) * 100}%` }} />
                </div>
                <div className="bu-load-more__buttons">
                  {remaining > 0 && (
                    <button type="button" className="bu-load-more__primary" onClick={() => setLimit((previous) => Math.min(previous + PAGE_SIZE, visibleProducts.length))}>
                      {translateText("Больше товаров")}
                      <span className="bu-load-more__count">+{Math.min(PAGE_SIZE, remaining)}</span>
                      <ArrowDown size={17} aria-hidden="true" />
                    </button>
                  )}
                  {expanded && (
                    <button type="button" className="bu-load-more__secondary" onClick={collapseProducts}>
                      {translateText("Свернуть")} <ArrowUp size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bu-empty">
            <Search size={28} aria-hidden="true" />
            <h3>{translateText("Пока ничего не нашли")}</h3>
            <p>{translateText("Попробуйте другое название или выберите все категории.")}</p>
            <button className="bu-button bu-button--primary" type="button" onClick={resetFilters}>{translateText("Сбросить фильтры")}</button>
          </div>
        )}

        <div className={`bu-notice${notice ? " is-visible" : ""}`} role="status" aria-live="polite" aria-atomic="true">
          {notice && <><ShoppingBag size={17} aria-hidden="true" /><span>{translateText(`Добавлено в корзину: ${notice.name}`)}</span></>}
        </div>
      </section>

      <section className="bu-makers" aria-labelledby="bu-makers-title">
        <div className="bu-makers__heading">
          <h2 id="bu-makers-title">{translateText("Знакомьтесь, кондитеры")}</h2>
          <Link to="/seller?tab=sellers">{translateText("Все продавцы")} <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="bu-makers__grid">
          {MAKERS.map((shop) => (
            <Link key={shop.id} className="bu-maker" to={`/profile?shop=${encodeURIComponent(shop.id)}`} aria-label={translateText(`Открыть профиль: ${shop.name}`)}>
              <div className="bu-maker__photo"><img src={shop.image} alt="" loading="lazy" decoding="async" /></div>
              <div className="bu-maker__info"><strong>{shop.name}</strong><span>{translateText(shop.description)}</span><small>{translateText("Открыть профиль")} <ArrowUpRight size={13} aria-hidden="true" /></small></div>
            </Link>
          ))}
        </div>
      </section>

      <Link to="/ai" className="bu-helper">
        <span className="bu-helper__icon"><Sparkles size={24} aria-hidden="true" /></span>
        <span className="bu-helper__text"><strong>{translateText("Не знаете, что выбрать?")}</strong><small>{translateText("Расскажите помощнику BakeU, чего хочется сегодня.")}</small></span>
        <span className="bu-helper__action">{translateText("Спросить помощника")} <ArrowRight size={19} aria-hidden="true" /></span>
      </Link>
    </div>
  );
}

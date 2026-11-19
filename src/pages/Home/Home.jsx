import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, ArrowUp, ArrowUpRight,
  MapPin, Search, ShoppingBag, Sparkles, X,
} from "lucide-react";
import { useProductBatchSize } from "../../hooks/useProductBatchSize";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { matchesLocalizedSearch, translateText } from "../../i18n/index.js";
import TopBanner from "../../components/TopBanner/TopBanner.jsx";
import ProductCard from "../../components/ProductCard/ProductCard";
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
  { id: "shahzoda", name: "Shahzoda Family", description: "Торты для особенных моментов.", image: "/images/products/cake.jpg", initials: "SF" },
  { id: "sweet-home", name: "Sweet Home", description: "Печенье и сладости к чаю", image: "/images/products/cookie.jpg", initials: "SH" },
  { id: "bakeu", name: "BakeU Bakery", description: "Домашний хлеб и ароматная самса", image: "/images/products/bread.jpg", initials: "BU" },
];

export default function Home({ catalog = demoProducts, subscriptions = demoSubscriptions }) {
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const batchSize = useProductBatchSize();
  const catalogRef = useRef(null);
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

  const displayedProducts = visibleProducts.slice(0, expanded ? batchSize * 2 : batchSize);
  const remaining = Math.max(0, visibleProducts.length - displayedProducts.length);
  const isFiltered = query.trim() !== "" || category !== "Все";

  const updateQuery = (value) => {
    setQuery(value);
    setExpanded(false);
  };
  const updateCategory = (value) => {
    setCategory(value);
    setExpanded(false);
  };

  const scrollToProducts = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    catalogRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };
  const openCatalog = (nextCategory = "Все") => {
    setQuery("");
    setCategory(CATEGORIES.some((item) => item.name === nextCategory) ? nextCategory : "Все");
    setExpanded(false);
    window.requestAnimationFrame(scrollToProducts);
  };
  const resetFilters = () => { setQuery(""); setCategory("Все"); setExpanded(false); };
  const handleAdd = (product) => {
    add(product);
    setNotice(product.name);
  };
  const collapseProducts = () => {
    setExpanded(false);
    window.requestAnimationFrame(scrollToProducts);
  };

  return (
    <main className="bu-home product-catalog">
      <TopBanner onCategoryClick={openCatalog} />

      <Link to="/map" className="bu-map">
        <span className="bu-map__icon"><MapPin size={21} aria-hidden="true" /></span>
        <span className="bu-map__text">
          <strong>{translateText("Вкусное ближе, чем кажется")}</strong>
          <span>{translateText("Откройте карту и найдите мастеров рядом")}</span>
        </span>
        <span className="bu-map__action">{translateText("Открыть карту")} <ArrowUpRight size={19} aria-hidden="true" /></span>
      </Link>

      <section id="home-catalog" ref={catalogRef} className="bu-catalog" aria-labelledby="bu-catalog-title">
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
            <input type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={translateText("Торт, печенье, хлеб…")} aria-label={translateText("Поиск товаров")} />
            {query && <button type="button" onClick={() => updateQuery("")} aria-label={translateText("Очистить поиск")}><X size={17} /></button>}
          </label>
        </div>

        <div className="bu-categories" role="group" aria-label={translateText("Категории товаров")}>
          {CATEGORIES.map((item) => {
            const count = item.name === "Все" ? featured.length : featured.filter((p) => p.category === item.name).length;
            return (
              <button key={item.name} type="button" className={`bu-category${category === item.name ? " is-active" : ""}`} aria-pressed={category === item.name} onClick={() => updateCategory(item.name)}>
                <span className="bu-category__emoji" aria-hidden="true">{item.icon}</span>
                {translateText(item.name)} <span className="bu-category__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="bu-results">
          <span>{translateText(isFiltered ? "Найдено товаров" : "Всего товаров")}: <strong>{visibleProducts.length}</strong></span>
          {isFiltered && <button type="button" onClick={resetFilters}>{translateText("Сбросить фильтры")} <X size={14} /></button>}
        </div>

        {visibleProducts.length > 0 ? (
          <>
            <div className="product-grid">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  sellerUrl={product.sellerId ? `/profile?shop=${encodeURIComponent(product.sellerId)}` : undefined}
                  quantity={items?.[product.id] ?? 0}
                  onAdd={handleAdd}
                />
              ))}
            </div>

            <div className="bu-load-more">
              <p className="bu-load-more__label">
                {translateText(`Показано ${displayedProducts.length} из ${visibleProducts.length} товаров`)}
              </p>
              <div className="bu-load-more__track" role="progressbar" aria-label={translateText("Показано товаров")} aria-valuemin={0} aria-valuemax={visibleProducts.length} aria-valuenow={displayedProducts.length}>
                <span style={{ width: `${(displayedProducts.length / visibleProducts.length) * 100}%` }} />
              </div>
              <div className="bu-load-more__buttons">
                {!expanded && remaining > 0 ? (
                  <button type="button" className="bu-load-more__primary" onClick={() => setExpanded(true)}>
                    {translateText("Больше товаров")}
                    <span className="bu-load-more__count">+{Math.min(batchSize, remaining)}</span>
                    <ArrowDown size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <Link className="bu-load-more__primary" to="/seller?tab=products&all=1">
                    {translateText("Больше товаров")} <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {expanded && (
                  <button type="button" className="bu-load-more__secondary" onClick={collapseProducts}>
                    {translateText("Свернуть")} <ArrowUp size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
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
          {notice && <><ShoppingBag size={17} aria-hidden="true" /><span>{translateText(`Добавлено в корзину: ${notice}`)}</span></>}
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

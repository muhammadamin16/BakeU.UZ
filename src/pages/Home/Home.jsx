import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, ArrowUp, ArrowUpRight,
  MapPin, Search, ShoppingBag, Sparkles, X,
} from "lucide-react";
import { useProductBatchSize } from "../../hooks/useProductBatchSize";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { matchesLocalizedSearch, translateText } from "../../i18n/index.js";
import TopBanner from "../../components/TopBanner/TopBanner.jsx";
import { ProductCard, ShopCard } from "../Seller/SellerParts";
import { categories, useCatalog } from "../../store/sellerData";
import { useCartStore } from "../../store/cartStore";
import "./Home.css";

const PREVIEW_BATCHES = 3;
const CATEGORY_ICONS = { "Все": "✦", "Торты": "🍰", "Печенье": "🍪", "Хлеб": "🥖", "Самса": "🥟" };
export default function Home() {
  const { products, shops } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState(null);
  const [batches, setBatches] = useState(1);
  const batchSize = useProductBatchSize();
  const catalogRef = useRef(null);
  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const shopById = new Map(shops.map((shop) => [String(shop.id), shop]));
  const normalized = normalizeSearch(query.trim());
  const visibleProducts = products.filter((product) => {
    const shop = shopById.get(String(product.shopId));
    return (category === "Все" || product.category === category) &&
      (!normalized || matchesLocalizedSearch(normalized, product.name, shop?.name));
  });
  const displayedProducts = visibleProducts.slice(0, batchSize * batches);
  const remaining = visibleProducts.length - displayedProducts.length;
  const expanded = batches > 1;
  const displayedShops = shops.slice(0, batchSize);

  const isFiltered = query.trim() !== "" || category !== "Все";

  const updateQuery = (value) => {
    setQuery(value);
    setBatches(1);
  };
  const updateCategory = (value) => {
    setCategory(value);
    setBatches(1);
  };

  const scrollToProducts = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    catalogRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };
  const openCatalog = (nextCategory = "Все") => {
    setQuery("");
    setCategory(categories.includes(nextCategory) ? nextCategory : "Все");
    setBatches(1);
    window.requestAnimationFrame(scrollToProducts);
  };
  const resetFilters = () => { setQuery(""); setCategory("Все"); setBatches(1); };
  const handleAdd = (product) => {
    add(product);
    setNotice(product.name);
  };
  const collapseProducts = () => {
    setBatches(1);
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
          {categories.map((item) => {
            const count = item === "Все" ? products.length : products.filter((p) => p.category === item).length;
            return (
              <button key={item} type="button" className={`bu-category${category === item ? " is-active" : ""}`} aria-pressed={category === item} onClick={() => updateCategory(item)}>
                <span className="bu-category__emoji" aria-hidden="true">{CATEGORY_ICONS[item] || "•"}</span>
                {translateText(item)} <span className="bu-category__count">{count}</span>
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
                  shop={shopById.get(String(product.shopId))}
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
                {batches < PREVIEW_BATCHES && remaining > 0 ? (
                  <button type="button" className="bu-load-more__primary" onClick={() => setBatches((current) => Math.min(current + 1, PREVIEW_BATCHES))}>
                    {translateText("Больше товаров")}
                    <span className="bu-load-more__count">+{Math.min(batchSize, remaining)}</span>
                    <ArrowDown size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <Link className="bu-load-more__primary" to="/seller?tab=products">
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

      {shops.length > 0 && (
        <section className="bu-makers" aria-labelledby="bu-makers-title">
          <div className="bu-makers__heading">
            <h2 id="bu-makers-title">{translateText("Знакомьтесь, кондитеры")}</h2>
            <Link to="/seller?tab=sellers">{translateText("Все продавцы")} <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>

          <div className="product-grid seller-shops">
            {displayedShops.map((shop) => <ShopCard key={shop.id} shop={shop} products={products} />)}
          </div>

          <div className="bu-load-more">
            <p className="bu-load-more__label" aria-live="polite">
              {translateText("Показано магазинов")} {displayedShops.length} / {shops.length}
            </p>
            <div className="bu-load-more__buttons">
              <Link className="bu-load-more__primary" to="/seller?tab=sellers">
                {translateText("Больше продавцов")} <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <Link to="/ai" className="bu-helper">
        <span className="bu-helper__icon"><Sparkles size={24} aria-hidden="true" /></span>
        <span className="bu-helper__text"><strong>{translateText("Не знаете, что выбрать?")}</strong><small>{translateText("Расскажите помощнику BakeU, чего хочется сегодня.")}</small></span>
        <span className="bu-helper__action">{translateText("Спросить помощника")} <ArrowRight size={19} aria-hidden="true" /></span>
      </Link>
    </main>
  );
}

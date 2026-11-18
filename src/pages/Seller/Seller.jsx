import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Check, MapPin, Search, ShoppingBag, Store, X } from "lucide-react";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { translateText } from "../../i18n/index.js";
import { useCartStore } from "../../store/cartStore";
import { useCatalog, categories } from "../../store/sellerData";
import { ProductCard, ShopCard } from "./SellerParts";
import SellerShop from "./SellerShop.jsx";
import "./Seller.css";

const PAGE_SIZE = 8;
const t = (value) => translateText(String(value ?? ""));
const ICONS = { "Все": "✦", "Торты": "🍰", "Печенье": "🍪", "Хлеб": "🥖", "Самса": "🥟" };

export default function Seller() {
  const [params] = useSearchParams();
  const shopId = params.get("shop");
  const tab = params.get("tab") === "sellers" ? "sellers" : "products";
  return shopId ? <SellerShop key={shopId} shopId={shopId} /> : <SellerCatalog key={tab} tab={tab} />;
}

function SellerCatalog({ tab }) {
  const { products, shops } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [notice, setNotice] = useState("");
  const catalogRef = useRef(null);
  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);
  const showSellers = tab === "sellers";
  const shopLookup = useMemo(() => new Map(shops.map((shop) => [shop.id, shop])), [shops]);
  const normalized = normalizeSearch(query.trim());

  const visibleProducts = useMemo(() => products.filter((product) => {
    const shop = shopLookup.get(product.shopId);
    const content = normalizeSearch(`${product.name ?? ""} ${shop?.name ?? ""} ${t(product.name)} ${t(shop?.name)}`);
    return (category === "Все" || product.category === category) && (!normalized || content.includes(normalized));
  }), [products, shopLookup, category, normalized]);

  const visibleShops = useMemo(() => shops.filter((shop) => {
    const shopProductNames = products.filter((product) => product.shopId === shop.id)
      .map((product) => `${product.name} ${t(product.name)}`).join(" ");
    const content = normalizeSearch(`${shop.name ?? ""} ${shop.description ?? ""} ${t(shop.name)} ${t(shop.description)} ${shopProductNames}`);
    return !normalized || content.includes(normalized);
  }), [shops, products, normalized]);

  useEffect(() => { setLimit(PAGE_SIZE); }, [query, category]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3300);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const shownProducts = visibleProducts.slice(0, limit);
  const remaining = Math.max(0, visibleProducts.length - shownProducts.length);
  const filtered = Boolean(query.trim()) || category !== "Все";
  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
    block: "start"
  });
  const reset = () => { setQuery(""); setCategory("Все"); setLimit(PAGE_SIZE); };
  const handleAdd = (product) => {
    add(product);
    setNotice(`${t("Добавлено в корзину:")} ${t(product.name)}`);
  };
  const collapse = () => { setLimit(PAGE_SIZE); window.requestAnimationFrame(scrollToCatalog); };

  return (
    <main className="seller-page seller-page--professional">
      <div className="seller-topline">
        <span className="seller-overline">BAKEU MARKETPLACE</span>
        <nav className="seller-tabs" aria-label={t("Раздел каталога")}>
          <Link to="?tab=products" className={!showSellers ? "is-active" : ""} aria-current={!showSellers ? "page" : undefined}>
            <ShoppingBag size={17} />{t("Товары")}
          </Link>
          <Link to="?tab=sellers" className={showSellers ? "is-active" : ""} aria-current={showSellers ? "page" : undefined}>
            <Store size={17} />{t("Продавцы")}
          </Link>
        </nav>
      </div>

      <header className="seller-heading">
        <div className="seller-heading__text">
          <span className="seller-eyebrow">{t("СДЕЛАНО С ЛЮБОВЬЮ")}</span>
          <h1>{t(showSellers ? "Знакомьтесь с мастерами" : "Найдите своё любимое")}</h1>
          <p>{t(showSellers ? "Откройте для себя кондитеров и пекарей BakeU." : "Торты, десерты и домашняя выпечка в одном месте.")}</p>
        </div>
        <label className="seller-search">
          <Search size={19} aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={t(showSellers ? "Найти магазин…" : "Найти вкусное…")}
            aria-label={t(showSellers ? "Поиск магазинов" : "Поиск товаров")} />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={t("Очистить поиск")}><X size={17}/></button>}
        </label>
      </header>

      <Link to="/map" className="seller-map">
        <span className="seller-map__icon"><MapPin size={22} /></span>
        <span className="seller-map__text"><strong>{t("Вкусное ближе, чем кажется")}</strong><small>{t("Откройте карту и найдите мастеров рядом")}</small></span>
        <span className="seller-map__link">{t("Открыть карту")} <span aria-hidden="true">↗</span></span>
      </Link>

      <section ref={catalogRef} className="seller-product-section" aria-label={t(showSellers ? "Продавцы" : "Товары")}>
        {!showSellers && <div className="seller-categories" role="group" aria-label={t("Категории")}>
          {categories.map((name) => {
            const count = name === "Все" ? products.length : products.filter((p) => p.category === name).length;
            return <button type="button" key={name} className={category === name ? "is-active" : ""} aria-pressed={category === name} onClick={() => setCategory(name)}>
              <span aria-hidden="true">{ICONS[name] || "✦"}</span>{t(name)}<span className="seller-category-count">{count}</span>
            </button>;
          })}
        </div>}
        <div className="seller-results">
          <span>{t(showSellers ? "Магазинов:" : "Товаров:")} <strong>{showSellers ? visibleShops.length : visibleProducts.length}</strong></span>
          {filtered && <button type="button" onClick={reset}>{t("Сбросить фильтры")} <X size={15}/></button>}
        </div>

        {showSellers ? <div className="seller-shops">
          {visibleShops.map((shop) => <ShopCard key={shop.id} shop={shop}/>)}
        </div> : <div className="seller-products">
          {shownProducts.map((product, index) => <div className="seller-product-entry" key={product.id} style={{ "--seller-stagger": `${Math.min(index % PAGE_SIZE, 7) * 45}ms` }}>
            <ProductCard product={product} quantity={items?.[product.id] ?? 0} onAdd={handleAdd}/>
          </div>)}
        </div>}

        {(showSellers ? visibleShops.length === 0 : visibleProducts.length === 0) && <div className="seller-empty">
          <Search size={29}/><h2>{t(showSellers ? "Магазины не найдены" : "Товары не найдены")}</h2>
          <p>{t("Попробуйте другой запрос или сбросьте фильтры.")}</p>
          <button type="button" onClick={reset}>{t("Сбросить фильтры")}</button>
        </div>}

        {!showSellers && visibleProducts.length > PAGE_SIZE && <div className="seller-pagination">
          <p>{t("Показано")} <strong>{shownProducts.length}</strong> {t("из")} <strong>{visibleProducts.length}</strong></p>
          <div className="seller-pagination__track" role="progressbar" aria-valuemin={0} aria-valuemax={visibleProducts.length} aria-valuenow={shownProducts.length} aria-label={t("Показано товаров")}>
            <span style={{ width: `${shownProducts.length / visibleProducts.length * 100}%` }}/>
          </div>
          <div className="seller-pagination__buttons">
            {remaining > 0 && <button type="button" className="seller-pagination__more" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              {t("Больше товаров")} <span className="seller-pagination__badge">+{Math.min(remaining, PAGE_SIZE)}</span><ArrowDown size={18}/>
            </button>}
            {limit > PAGE_SIZE && <button type="button" className="seller-pagination__less" onClick={collapse}>{t("Свернуть")}<ArrowUp size={17}/></button>}
          </div>
        </div>}
      </section>
      <p className="seller-demo">{t("Демо-каталог: магазины, рейтинги и отзывы приведены для примера.")}</p>
      <div className={`seller-notice seller-notice--toast ${notice ? "is-visible" : ""}`} role="status" aria-live="polite"><Check size={18}/>{notice}</div>
    </main>
  );
}

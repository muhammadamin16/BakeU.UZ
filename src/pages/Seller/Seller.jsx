import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Search, ShoppingBag, Store, X } from "lucide-react";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { matchesLocalizedSearch, translateText } from "../../i18n/index.js";
import { useCartStore } from "../../store/cartStore";
import { useCatalog } from "../../store/sellerData";
import CatalogCategories from "../../components/CatalogCategories/CatalogCategories";
import { ProductCard, ShopCard } from "./SellerParts";
import SellerShop from "./SellerShop.jsx";
import ServerCatalog from "./ServerCatalog.jsx";
import { serverStorefrontEnabled } from "../../api/goAccount.js";
import "./Seller.css";

const t = (value) => translateText(String(value ?? ""));

export default function Seller() {
  const [params] = useSearchParams();
  const shopId = params.get("shop");
  const tab = params.get("tab") === "sellers" ? "sellers" : "products";
  if (serverStorefrontEnabled && !shopId && tab === "products") return <ServerCatalog />;
  return shopId
    ? <SellerShop key={shopId} shopId={shopId} />
    : <SellerCatalog key={tab} tab={tab} />;
}

function SellerCatalog({ tab }) {
  const { products, shops } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState(null);
  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);
  const showSellers = tab === "sellers";
  const normalized = normalizeSearch(query.trim());

  const shopById = useMemo(() => new Map(shops.map((s) => [String(s.id), s])), [shops]);
  const visibleProducts = useMemo(() => products.filter((p) => {
    const shop = shopById.get(String(p.shopId));
    return (category === "Все" || category === p.category) &&
      (!normalized || matchesLocalizedSearch(normalized, p.name, shop?.name));
  }), [products, shopById, category, normalized]);
  const visibleShops = useMemo(() => shops.filter((s) => {
    return !normalized ||
      matchesLocalizedSearch(normalized, s.name, s.description) ||
      products.some((p) =>
        String(p.shopId) === String(s.id) && matchesLocalizedSearch(normalized, p.name),
      );
  }), [shops, products, normalized]);

  const updateQuery = (value) => {
    setQuery(value);
  };
  const updateCategory = (value) => {
    setCategory(value);
  };
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const reset = () => { setQuery(""); setCategory("Все"); };
  const addProduct = (product) => { add(product); setNotice(product.name); };

  return (
    <main className="seller-page seller-page--professional product-catalog">
      <header className="seller-header">
        <div className="seller-header__top">
          <div className="seller-heading">
            <h1>{t(showSellers ? "Магазины" : "Каталог")}</h1>
            <p>{t(showSellers ? "Выберите своего мастера" : "Выберите то, что нравится")}</p>
          </div>
          <nav className="seller-tabs" aria-label={t("Раздел каталога")}>
            <Link to="?tab=products" className={!showSellers ? "is-active" : ""} aria-current={!showSellers ? "page" : undefined}><ShoppingBag size={17} />{t("Товары")}</Link>
            <Link to="?tab=sellers" className={showSellers ? "is-active" : ""} aria-current={showSellers ? "page" : undefined}><Store size={17} />{t("Продавцы")}</Link>
          </nav>
        </div>
        <div className="seller-search" role="search">
          <Search size={19} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => updateQuery(e.target.value)} placeholder={t(showSellers ? "Поиск магазина" : "Найти товар")} aria-label={t("Поиск")} />
          {query && <button type="button" onClick={() => updateQuery("")} aria-label={t("Очистить поиск")}><X size={17} /></button>}
        </div>
      </header>

      <section className="seller-product-section" aria-label={t(showSellers ? "Продавцы" : "Товары")}>
        {!showSellers && <CatalogCategories products={products} value={category} onChange={updateCategory} />}
        <div className="seller-results">
          <span>{showSellers ? visibleShops.length : visibleProducts.length} {t(showSellers ? "магазинов" : "товаров")}</span>
          {(query || (!showSellers && category !== "Все")) && <button type="button" onClick={reset}>{t("Сбросить")} <X size={14} /></button>}
        </div>
        {showSellers ? (
          <div className="product-grid seller-shops">
            {visibleShops.map((shop, index) => (
              <div
                key={shop.id}
                className="seller-grid-entry"
                style={{ "--seller-stagger": `${Math.min(index, 8) * 30}ms` }}
              >
                <ShopCard shop={shop} products={products} />
              </div>
            ))}
          </div>
        ) : (
          <div className="product-grid">{visibleProducts.map((product, index) => <div key={product.id} className="seller-grid-entry" style={{ "--seller-stagger": `${(index % 16) * 20}ms` }}><ProductCard product={product} shop={shopById.get(String(product.shopId))} quantity={items?.[product.id] ?? 0} onAdd={addProduct} /></div>)}</div>
        )}
        {(showSellers ? visibleShops.length === 0 : visibleProducts.length === 0) && <div className="seller-empty"><Search size={25} /><h2>{t("Ничего не найдено")}</h2><button type="button" onClick={reset}>{t("Сбросить")}</button></div>}

      </section>
      <div className={`seller-notice seller-notice--toast ${notice ? "is-visible" : ""}`} role="status" aria-live="polite"><Check size={17} />{notice && t(`Добавлено в корзину: ${notice}`)}</div>
    </main>
  );
}

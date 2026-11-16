import { translateText } from "../../i18n/index.js";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Store, ShoppingBag, Search, X } from "lucide-react";

import { useCartStore } from "../../store/cartStore";
import { useCatalog, categories } from "../../store/sellerData";
import { ProductCard, ShopCard } from "./SellerParts";
import SellerShop from "./SellerShop";
import "./Seller.css";

export default function Seller() {
  const [params] = useSearchParams();
  const shopId = params.get("shop");
  const tab = params.get("tab") === "sellers" ? "sellers" : "products";

  if (shopId) return <SellerShop key={shopId} shopId={shopId} />;
  return <SellerCatalog key={tab} tab={tab} />;
}

function SellerCatalog({ tab }) {
  const { products, shops } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState("");

  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);

  const showSellers = tab === "sellers";
  const q = query.trim().toLocaleLowerCase("ru-RU");

  const visibleProducts = products.filter((p) => {
    const owner = shops.find((s) => s.id === p.shopId);
    return (
      `${p.name} ${owner?.name ?? ""} ${translateText(p.name)} ${translateText(owner?.name ?? "")}`
        .toLocaleLowerCase("ru-RU")
        .includes(q) &&
      (category === "Все" || category === p.category)
    );
  });

  const visibleShops = shops.filter((s) => {
    const names = products
      .filter((p) => p.shopId === s.id)
      .map((p) => p.name + " " + translateText(p.name))
      .join(" ");
    return `${s.name} ${s.description} ${names} ${translateText(s.name)} ${translateText(s.description)}`
      .toLocaleLowerCase("ru-RU")
      .includes(q);
  });

  const resetFilters = () => {
    setQuery("");
    setCategory("Все");
  };

  const addProduct = (product) => {
    add(product);
    setNotice(`Добавлено в корзину: ${product.name}`);
  };

  return (
    <main className="seller-page">
      <nav
        className="seller-tabs"
        aria-label={translateText("Раздел каталога")}
      >
        <Link
          to="?tab=sellers"
          className={showSellers ? "is-active" : ""}
          aria-current={showSellers ? "page" : undefined}
        >
          <Store size={19} aria-hidden="true" />
          {translateText("Продавцы")}
        </Link>
        <Link
          to="?tab=products"
          className={!showSellers ? "is-active" : ""}
          aria-current={!showSellers ? "page" : undefined}
        >
          <ShoppingBag size={19} aria-hidden="true" />
          {translateText("Товары")}
        </Link>
      </nav>

      <div className="seller-heading">
        <div>
          <span className="seller-eyebrow">
            {translateText("СДЕЛАНО С ЛЮБОВЬЮ")}
          </span>
          <h1>
            {translateText(
              showSellers ? "Знакомьтесь с мастерами" : "Найдите своё любимое",
            )}
          </h1>
          <p>
            {translateText(
              showSellers
                ? "Маленькие магазины с большим вниманием к вкусу."
                : "Торты, десерты и домашняя выпечка в одном месте.",
            )}
          </p>
        </div>

        <label className="seller-search">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translateText(
              showSellers ? "Найти магазин…" : "Найти вкусное…",
            )}
            aria-label={translateText(
              showSellers ? "Поиск магазинов" : "Поиск товаров",
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={translateText("Очистить поиск")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <p className="seller-demo">
        {translateText(
          "Демо-каталог: магазины, рейтинги и отзывы приведены для примера.",
        )}
      </p>

      {showSellers ? (
        <section
          className="seller-shops"
          aria-label={translateText("Продавцы")}
        >
          {visibleShops.map((s) => (
            <ShopCard key={s.id} shop={s} />
          ))}
          {visibleShops.length === 0 && (
            <div className="seller-empty">
              <Store size={28} aria-hidden="true" />
              <h2>{translateText("Магазины не найдены")}</h2>
              <p>{translateText("Попробуйте другое название.")}</p>
              <button
                type="button"
                className="seller-pill"
                onClick={resetFilters}
              >
                {translateText("Сбросить поиск")}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section aria-label={translateText("Товары")}>
          <div className="seller-categories">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={category === c ? "is-active" : ""}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {translateText(c)}
              </button>
            ))}
          </div>

          <div className="seller-results">
            <span>
              {translateText("Товаров: ")}
              {visibleProducts.length}
            </span>
            {(query || category !== "Все") && (
              <button type="button" onClick={resetFilters}>
                {translateText("Сбросить фильтры ")}
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="seller-products">
            {visibleProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                quantity={items?.[p.id] ?? 0}
                onAdd={addProduct}
              />
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div className="seller-empty">
              <Search size={28} aria-hidden="true" />
              <h2>{translateText("Товары не найдены")}</h2>
              <p>
                {translateText("Попробуйте другое название или категорию.")}
              </p>
              <button
                type="button"
                className="seller-pill"
                onClick={resetFilters}
              >
                {translateText("Сбросить фильтры")}
              </button>
            </div>
          )}
        </section>
      )}

      <p className="seller-notice" role="status">
        {translateText(notice)}
      </p>
    </main>
  );
}

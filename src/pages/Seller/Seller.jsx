import { useState } from "react";
import {
  Store,
  ShoppingBag,
  Search,
  Star,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  X,
} from "lucide-react";

import { useCartStore } from "../../store/cartStore";
import "./Seller.css";

const products = [
  {
    id: "cake",
    name: "Шоколадный торт",
    category: "Торты",
    price: 45000,
    image: "/images/products/cake.jpg",
    shopId: "shahzoda",
  },
  {
    id: "cookie",
    name: "Домашнее печенье",
    category: "Печенье",
    price: 13200,
    image: "/images/products/cookie.jpg",
    shopId: "sweet-home",
  },
  {
    id: "bread",
    name: "Домашний хлеб",
    category: "Хлеб",
    price: 3400,
    image: "/images/products/bread.jpg",
    shopId: "bakeu",
  },
  {
    id: "somsa",
    name: "Самса",
    category: "Самса",
    price: 7000,
    image: "/images/products/somsa.jpg",
    shopId: "bakeu",
  },
];

const shops = [
  {
    id: "shahzoda",
    name: "Shahzoda Family",
    initials: "SF",
    color: "#ead9bd",
    description:
      "Торты и десерты для семейных праздников и особенных моментов.",
    rating: "5.0",
    reviewsCount: 24,
    review: {
      author: "Мадина",
      text: "Красивый торт и нежный вкус. Отлично подошёл для нашего праздника!",
    },
  },
  {
    id: "sweet-home",
    name: "Sweet Home",
    initials: "SH",
    color: "#e9d8df",
    description:
      "Домашнее печенье и сладкие дополнения к любимому чаю.",
    rating: "4.9",
    reviewsCount: 18,
    review: {
      author: "Азиза",
      text: "Очень вкусное печенье. Заказывали к семейному чаепитию.",
    },
  },
  {
    id: "bakeu",
    name: "BakeU Bakery",
    initials: "BU",
    color: "#dce5d4",
    description:
      "Домашний хлеб и сытная выпечка для уютных завтраков и обедов.",
    rating: "4.8",
    reviewsCount: 32,
    review: {
      author: "Сардор",
      text: "Понравились хлеб и самса. Обязательно попробуем ещё.",
    },
  },
];

const categories = ["Все", "Торты", "Печенье", "Хлеб", "Самса"];

const formatPrice = (price) =>
  `${price.toLocaleString("ru-RU")} сум`;

export default function Seller() {
  const [tab, setTab] = useState("products");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [notice, setNotice] = useState("");

  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  const selectedShop = shops.find(
    (shop) => shop.id === selectedShopId
  );

  const visibleProducts = products.filter((product) => {
    const shop = shops.find((item) => item.id === product.shopId);

    const matchesQuery =
      `${product.name} ${shop?.name ?? ""}`
        .toLocaleLowerCase("ru-RU")
        .includes(normalizedQuery);

    return (
      matchesQuery &&
      (category === "Все" || product.category === category) &&
      (!selectedShopId || product.shopId === selectedShopId)
    );
  });

  const visibleShops = shops.filter((shop) => {
    const shopProducts = products
      .filter((product) => product.shopId === shop.id)
      .map((product) => product.name)
      .join(" ");

    return `${shop.name} ${shop.description} ${shopProducts}`
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery);
  });

  function changeTab(nextTab) {
    setTab(nextTab);
    setQuery("");
    setCategory("Все");
    setSelectedShopId(null);
    setNotice("");
  }

  function openShop(shopId) {
    setSelectedShopId(shopId);
    setTab("products");
    setQuery("");
    setCategory("Все");
    setNotice("");
  }

  function resetFilters() {
    setQuery("");
    setCategory("Все");
    setSelectedShopId(null);
  }

  function addProduct(product) {
    add(product.id);
    setNotice(`Добавлено в корзину: ${product.name}`);
  }

  return (
    <main className="seller-page">
      <div className="seller-tabs" role="group" aria-label="Что показать">
        <button
          type="button"
          className={tab === "sellers" ? "is-active" : ""}
          aria-pressed={tab === "sellers"}
          onClick={() => changeTab("sellers")}
        >
          <Store size={19} aria-hidden="true" />
          Продавцы.
        </button>

        <button
          type="button"
          className={tab === "products" ? "is-active" : ""}
          aria-pressed={tab === "products"}
          onClick={() => changeTab("products")}
        >
          <ShoppingBag size={19} aria-hidden="true" />
          Товары
        </button>
      </div>

      <div className="seller-heading">
        <div>
          <span className="seller-eyebrow">СДЕЛАНО С ЛЮБОВЬЮ</span>

          <h1>
            {tab === "sellers"
              ? "Знакомьтесь с мастерами"
              : selectedShop
                ? selectedShop.name
                : "Найдите своё любимое"}
          </h1>

          <p>
            {tab === "sellers"
              ? "Маленькие магазины с большим вниманием к вкусу."
              : selectedShop
                ? selectedShop.description
                : "Торты, десерты и домашняя выпечка в одном месте."}
          </p>
        </div>

        <label className="seller-search">
          <Search size={20} aria-hidden="true" />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              tab === "sellers"
                ? "Найти магазин…"
                : "Найти вкусное…"
            }
            aria-label={
              tab === "sellers" ? "Поиск магазинов" : "Поиск товаров"
            }
          />
        </label>
      </div>

      <p className="seller-demo">
        Демо-каталог: магазины, рейтинги и отзывы приведены для примера.
      </p>

      {tab === "products" ? (
        <section aria-label="Товары">
          {selectedShop && (
            <div className="seller-shop-filter">
              <button
                type="button"
                className="seller-back"
                onClick={() => changeTab("sellers")}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Все магазины
              </button>

              <span>Товары магазина {selectedShop.name}</span>
            </div>
          )}

          <div className="seller-categories">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "is-active" : ""}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="seller-results">
            <span>Товаров: {visibleProducts.length}</span>

            {(query || category !== "Все" || selectedShopId) && (
              <button type="button" onClick={resetFilters}>
                Сбросить фильтры
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="seller-products">
            {visibleProducts.map((product) => {
              const shop = shops.find(
                (item) => item.id === product.shopId
              );
              const quantity = items?.[product.id] ?? 0;

              return (
                <article className="seller-product" key={product.id}>
                  <div className="seller-product__image">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                    />

                    {quantity > 0 && (
                      <span className="seller-product__count">
                        В корзине: {quantity}
                      </span>
                    )}
                  </div>

                  <div className="seller-product__body">
                    <button
                      type="button"
                      className="seller-product__shop"
                      onClick={() => openShop(product.shopId)}
                    >
                      <Store size={13} aria-hidden="true" />
                      {shop?.name}
                    </button>

                    <h2>{product.name}</h2>

                    <div className="seller-product__bottom">
                      <strong>{formatPrice(product.price)}</strong>

                      <button
                        type="button"
                        className="seller-product__add"
                        onClick={() => addProduct(product)}
                        aria-label={`Добавить в корзину: ${product.name}`}
                      >
                        <Plus size={21} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {visibleProducts.length === 0 && (
            <div className="seller-empty">
              <Search size={28} aria-hidden="true" />
              <h2>Товары не найдены</h2>
              <p>Попробуйте другое название или сбросьте фильтры.</p>
              <button type="button" onClick={resetFilters}>
                Показать все товары
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="seller-shops" aria-label="Магазины">
          {visibleShops.map((shop) => {
            const shopProducts = products.filter(
              (product) => product.shopId === shop.id
            );

            return (
              <article className="seller-shop" key={shop.id}>
                <div className="seller-shop__top">
                  <div
                    className="seller-shop__logo"
                    style={{ "--shop-color": shop.color }}
                    aria-label={`Логотип ${shop.name}`}
                  >
                    {shop.initials}
                  </div>

                  <div className="seller-shop__identity">
                    <h2>{shop.name}</h2>

                    <div className="seller-shop__rating">
                      <Star
                        size={14}
                        fill="currentColor"
                        aria-hidden="true"
                      />
                      <strong>{shop.rating}</strong>
                      <span>Оценок: {shop.reviewsCount}</span>
                    </div>
                  </div>
                </div>

                <p className="seller-shop__description">
                  {shop.description}
                </p>

                <div className="seller-shop__preview-heading">
                  <h3>Витрина магазина</h3>
                  <span>{shopProducts.length} шт.</span>
                </div>

                <div className="seller-shop__products">
                  {shopProducts.slice(0, 3).map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => openShop(shop.id)}
                      aria-label={`Посмотреть ${product.name} в магазине ${shop.name}`}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                      />
                      <span>{product.name}</span>
                      <strong>{formatPrice(product.price)}</strong>
                    </button>
                  ))}
                </div>

                <blockquote className="seller-shop__review">
                  <p>«{shop.review.text}»</p>
                  <footer>{shop.review.author} · пример отзыва</footer>
                </blockquote>

                <button
                  type="button"
                  className="seller-shop__open"
                  onClick={() => openShop(shop.id)}
                >
                  Посмотреть товары
                  <ArrowUpRight size={19} aria-hidden="true" />
                </button>
              </article>
            );
          })}

          {visibleShops.length === 0 && (
            <div className="seller-empty">
              <Store size={28} aria-hidden="true" />
              <h2>Магазины не найдены</h2>
              <p>Попробуйте другое название.</p>
              <button type="button" onClick={() => setQuery("")}>
                Показать все магазины
              </button>
            </div>
          )}
        </section>
      )}

      <p className="seller-notice" role="status" aria-live="polite">
        {notice}
      </p>
    </main>
  );
}
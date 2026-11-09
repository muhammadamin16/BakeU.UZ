import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Check,
  X,
} from "lucide-react";

import { useCartStore } from "../../store/cartStore";
import "./Home.css";

const products = [
  {
    id: "cookie",
    name: "Печенье",
    category: "Печенье",
    price: 13200,
    image: "/images/products/cookie.jpg",
    color: "#f2e5dd",
  },
  {
    id: "bread",
    name: "Домашний хлеб",
    category: "Хлеб",
    price: 3400,
    image: "/images/products/bread.jpg",
    color: "#e6eee5",
  },
  {
    id: "cake",
    name: "Шоколадный торт",
    category: "Торты",
    price: 45000,
    image: "/images/products/cake.jpg",
    color: "#eee5f2",
  },
  {
    id: "somsa",
    name: "Самса",
    category: "Самса",
    price: 7000,
    image: "/images/products/somsa.jpg",
    color: "#f6ead4",
  },
];

const categories = [
  { name: "Все", icon: "✦" },
  { name: "Торты", icon: "🍰" },
  { name: "Печенье", icon: "🍪" },
  { name: "Хлеб", icon: "🥖" },
  { name: "Самса", icon: "🥟" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState("");

  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      category === "Все" || product.category === category;

    const matchesQuery = product.name
      .toLocaleLowerCase("ru-RU")
      .includes(query.trim().toLocaleLowerCase("ru-RU"));

    return matchesCategory && matchesQuery;
  });

  function resetFilters() {
    setQuery("");
    setCategory("Все");
  }

  function scrollToProducts() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    document.getElementById("home-catalog")?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  function openCatalog(nextCategory = "Все") {
    setQuery("");
    setCategory(nextCategory);
    scrollToProducts();
  }

  function handleAdd(product) {
    add(product.id);
    setNotice(`Добавлено в корзину: ${product.name}`);
  }

  const isFiltered = query.trim() !== "" || category !== "Все";

  return (
    <main className="bu-home">
      <section className="bu-hero" aria-labelledby="bu-hero-title">
        <div className="bu-hero__content">
          <span className="bu-eyebrow">
            <span aria-hidden="true" />
            МАЛЕНЬКИЕ РАДОСТИ КАЖДЫЙ ДЕНЬ
          </span>

          <h1 id="bu-hero-title">
            По-домашнему.
            <br />
            <span>По вашему вкусу.</span>
          </h1>

          <p className="bu-hero__description">
            Торты, десерты и выпечка от местных мастеров.
            Найдите что-нибудь особенное на BakeU.
          </p>

          <div className="bu-hero__actions">
            <button
              type="button"
              className="bu-button bu-button--primary"
              onClick={() => openCatalog()}
            >
              Выбрать вкусное
              <ArrowRight size={18} aria-hidden="true" />
            </button>

            <Link
              to="/map"
              className="bu-button bu-button--secondary"
            >
              <MapPin size={18} aria-hidden="true" />
              Найти рядом
            </Link>
          </div>
        </div>

        <div className="bu-hero__gallery">
          <button
            type="button"
            className="bu-feature bu-feature--cake"
            onClick={() => openCatalog("Торты")}
            aria-label="Посмотреть торты"
          >
            <img
              src="/images/products/cake.jpg"
              alt="Шоколадный торт"
              fetchPriority="high"
            />

            <span className="bu-feature__caption">
              <span>Для особого повода</span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className="bu-feature bu-feature--cookie"
            onClick={() => openCatalog("Печенье")}
            aria-label="Посмотреть печенье"
          >
            <img
              src="/images/products/cookie.jpg"
              alt="Домашнее печенье"
            />

            <span className="bu-feature__caption">
              <span>К любимому чаю</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </span>
          </button>

          <span className="bu-hero__note">
            С любовью к вкусному ♡
          </span>
        </div>
      </section>

      <Link to="/map" className="bu-map">
        <span className="bu-map__icon">
          <MapPin size={22} aria-hidden="true" />
        </span>

        <span className="bu-map__text">
          <strong>Вкусное ближе, чем кажется</strong>
          <span>Откройте карту и найдите мастеров рядом</span>
        </span>

        <span className="bu-map__action">
          <span>Открыть карту</span>
          <ArrowUpRight size={21} aria-hidden="true" />
        </span>
      </Link>

      <section
        id="home-catalog"
        className="bu-catalog"
        aria-labelledby="bu-catalog-title"
      >
        <div className="bu-catalog__top">
          <div>
            <span className="bu-overline">КАТАЛОГ BAKEU</span>
            <h2 id="bu-catalog-title">Что хочется сегодня?</h2>
          </div>

          <div className="bu-search">
            <Search size={20} aria-hidden="true" />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Торт, печенье, хлеб…"
              aria-label="Поиск товаров"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Очистить поиск"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        <div className="bu-categories" aria-label="Категории товаров">
          {categories.map((item) => {
            const count = products.filter(
              (product) =>
                item.name === "Все" ||
                product.category === item.name
            ).length;

            return (
              <button
                key={item.name}
                type="button"
                className={`bu-category ${
                  category === item.name ? "is-active" : ""
                }`}
                aria-pressed={category === item.name}
                onClick={() => setCategory(item.name)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.name}
                <span className="bu-category__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="bu-results">
          <span>
            {isFiltered ? "Найдено товаров" : "Всего товаров"}:{" "}
            <strong>{visibleProducts.length}</strong>
          </span>

          {isFiltered && (
            <button type="button" onClick={resetFilters}>
              Сбросить фильтры
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="bu-products">
          {visibleProducts.map((product) => {
            const quantity = items?.[product.id] ?? 0;

            return (
              <article className="bu-product" key={product.id}>
                <div
                  className="bu-product__image"
                  style={{ backgroundColor: product.color }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                  />

                  {quantity > 0 && (
                    <span className="bu-product__quantity">
                      <Check size={13} aria-hidden="true" />
                      В корзине: {quantity}
                    </span>
                  )}
                </div>

                <div className="bu-product__body">
                  <span className="bu-product__category">
                    {product.category}
                  </span>

                  <h3>{product.name}</h3>

                  <div className="bu-product__bottom">
                    <span className="bu-product__price">
                      {product.price.toLocaleString("ru-RU")}
                      <small>сум</small>
                    </span>

                    <button
                      type="button"
                      className="bu-product__add"
                      onClick={() => handleAdd(product)}
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
          <div className="bu-empty">
            <Search size={30} aria-hidden="true" />
            <h3>Пока ничего не нашли</h3>
            <p>Попробуйте другое название или выберите все категории.</p>

            <button
              type="button"
              className="bu-button bu-button--primary"
              onClick={resetFilters}
            >
              Показать все товары
            </button>
          </div>
        )}

        <div
          className="bu-notice"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {notice && (
            <>
              <ShoppingBag size={16} aria-hidden="true" />
              <span>{notice}</span>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
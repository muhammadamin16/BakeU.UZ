import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  MapPin,
  ArrowUpRight,
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
    color: "#dccbc8",
  },
  {
    id: "bread",
    name: "Домашний хлеб",
    category: "Хлеб",
    price: 3400,
    image: "/images/products/bread.jpg",
    color: "#a8d5d8",
  },
  {
    id: "cake",
    name: "Шоколадный торт",
    category: "Торты",
    price: 45000,
    image: "/images/products/cake.jpg",
    color: "#ddc8fa",
  },
  {
    id: "somsa",
    name: "Самса",
    category: "Самса",
    price: 7000,
    image: "/images/products/somsa.jpg",
    color: "#f6d2a7",
  },
];

const categories = [
  { name: "Все", color: "#f8d971" },
  { name: "Печенье", color: "#dccbc8" },
  { name: "Торты", color: "#a8d5d8" },
  { name: "Хлеб", color: "#ffcbb4" },
  { name: "Самса", color: "#ddc8fa" },
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
      .toLowerCase()
      .includes(query.trim().toLowerCase());

    return matchesCategory && matchesQuery;
  });

  function resetFilters() {
    setQuery("");
    setCategory("Все");
  }

  function scrollToProducts() {
    document.getElementById("home-catalog")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function handleAdd(product) {
    add(product.id);
    setNotice(`Добавлено в корзину: ${product.name}`);
  }

  return (
    <main className="container home">
      <section className="home-hero">
        <div className="home-hero__heading">
          <h1>Вкусная выпечка</h1>
          <span className="home-badge home-badge--tasty">
            TASTY
          </span>
        </div>

        <div className="home-hero__content">
          <p>
            Свежий хлеб
            <br />
            и сладости —
            <br />
            прямо из печи
          </p>

          <span className="home-badge home-badge--crunchy">
            CRUNCHY
          </span>

          <button
            type="button"
            className="home-order-button"
            onClick={scrollToProducts}
          >
            Выбрать
          </button>
        </div>

        <div className="home-hero__image">
          <img
            src="/images/banners/hero.jpg"
            alt="Свежий хлеб с хрустящей корочкой"
            fetchPriority="high"
          />

          <span className="home-badge home-badge--fresh">
            FRESH
          </span>
        </div>
      </section>

      <Link to="/map" className="home-map-banner">
        <span className="home-map-banner__icon">
          <MapPin size={25} />
        </span>

        <div>
          <h2>Посмотреть на карте</h2>
          <p>Найти выпечку и кондитеров рядом</p>
        </div>

        <ArrowUpRight size={25} />
      </Link>

      <section id="home-catalog" className="home-catalog">
        <label className="home-search">
          <Search size={25} strokeWidth={1.8} />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти выпечку…"
            aria-label="Поиск выпечки"
          />
        </label>

        <div className="home-categories" aria-label="Категории">
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
                className={`home-category ${
                  category === item.name ? "is-active" : ""
                }`}
                style={{ backgroundColor: item.color }}
                aria-pressed={category === item.name}
                onClick={() => setCategory(item.name)}
              >
                {item.name}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="home-section-heading">
          <h2>Популярное</h2>

          <button type="button" onClick={resetFilters}>
            Все товары
          </button>
        </div>

        <p className="home-notice" role="status">
          {notice}
        </p>

        <div className="home-grid">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="home-product"
              style={{ backgroundColor: product.color }}
            >
              <div className="home-product__image">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                />
              </div>

              <h3>{product.name}</h3>

              <div className="home-product__bottom">
                <span className="home-product__price">
                  {product.price.toLocaleString("ru-RU")} сум
                </span>

                <button
                  type="button"
                  className="home-product__add"
                  aria-label={`Добавить в корзину: ${product.name}`}
                  onClick={() => handleAdd(product)}
                >
                  <ShoppingBag size={23} strokeWidth={1.8} />

                  {items[product.id] > 0 && (
                    <span className="home-product__count">
                      {items[product.id]}
                    </span>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>

        {visibleProducts.length === 0 && (
          <div className="home-empty">
            <h3>Ничего не найдено</h3>
            <p>Попробуй другое название или категорию.</p>
            <button type="button" onClick={resetFilters}>
              Показать все товары
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
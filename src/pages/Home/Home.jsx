import { normalizeSearch } from "../../i18n/alphabet.js";
import { getLocale } from "../../i18n/index.js";
import { translateText } from "../../i18n/index.js";
import HeroSlider from "./components/HeroSlider";
import {
  demoProducts,
  demoSubscriptions,
  eligibleProducts,
} from "../../store/homeData";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import { useEffect, useState } from "react";
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

const products = demoProducts;

const categories = [
  { name: "Все", icon: "✦" },
  { name: "Торты", icon: "🍰" },
  { name: "Печенье", icon: "🍪" },
  { name: "Хлеб", icon: "🥖" },
  { name: "Самса", icon: "🥟" },
];

export default function Home({
  catalog = products,
  subscriptions = demoSubscriptions,
  demo = true,
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const featured = eligibleProducts(catalog, subscriptions, now);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState("");

  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  const visibleProducts = featured.filter((product) => {
    const matchesCategory = category === "Все" || product.category === category;

    const matchesQuery = normalizeSearch(
      product.name + " " + translateText(product.name),
    ).includes(normalizeSearch(query));

    return matchesCategory && matchesQuery;
  });

  function resetFilters() {
    setQuery("");
    setCategory("Все");
  }

  function scrollToProducts() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
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
    add(product);
    setNotice(`Добавлено в корзину: ${product.name}`);
  }

  const isFiltered = query.trim() !== "" || category !== "Все";

  return (
    <main className="bu-home">
      <section className="bu-hero" aria-labelledby="bu-hero-title">
        <div className="bu-hero__content">
          <span className="bu-eyebrow">
            <span aria-hidden="true" />
            {translateText("МАЛЕНЬКИЕ РАДОСТИ КАЖДЫЙ ДЕНЬ")}
          </span>

          <h1 id="bu-hero-title">
            {translateText("По-домашнему.")}
            <br />
            <span>{translateText("По вашему вкусу.")}</span>
          </h1>

          <p className="bu-hero__description">
            {translateText(
              "Торты, десерты и выпечка от местных мастеров. Найдите что-нибудь особенное на BakeU.",
            )}
          </p>

          <div className="bu-hero__actions">
            <button
              type="button"
              className="bu-button bu-button--primary"
              onClick={() => openCatalog()}
            >
              {translateText("Выбрать вкусное")}
              <ArrowRight size={18} aria-hidden="true" />
            </button>

            <Link to="/map" className="bu-button bu-button--secondary">
              <MapPin size={18} aria-hidden="true" />
              {translateText("Найти рядом")}
            </Link>
          </div>
        </div>

        <div className="bu-hero__gallery">
          <button
            type="button"
            className="bu-feature bu-feature--cake"
            onClick={() => openCatalog("Торты")}
            aria-label={translateText("Посмотреть торты")}
          >
            <img
              src="/images/products/cake.jpg"
              alt={translateText("Шоколадный торт")}
              fetchPriority="high"
            />

            <span className="bu-feature__caption">
              <span>{translateText("Для особого повода")}</span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className="bu-feature bu-feature--cookie"
            onClick={() => openCatalog("Печенье")}
            aria-label={translateText("Посмотреть печенье")}
          >
            <img
              src="/images/products/cookie.jpg"
              alt={translateText("Домашнее печенье")}
            />

            <span className="bu-feature__caption">
              <span>{translateText("К любимому чаю")}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </span>
          </button>

          <span className="bu-hero__note">
            {translateText("С любовью к вкусному ♡")}
          </span>
        </div>
      </section>

      <Link to="/map" className="bu-map">
        <span className="bu-map__icon">
          <MapPin size={22} aria-hidden="true" />
        </span>

        <span className="bu-map__text">
          <strong>{translateText("Вкусное ближе, чем кажется")}</strong>
          <span>
            {translateText("Откройте карту и найдите мастеров рядом")}
          </span>
        </span>

        <span className="bu-map__action">
          <span>{translateText("Открыть карту")}</span>
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
            <span className="bu-overline">
              {translateText("ВИТРИНА МАСТЕРОВ")}
            </span>
            <h2 id="bu-catalog-title">{translateText("Топ товары")}</h2>
            <Link className="bu-all-products" to="/seller?tab=products">
              {translateText("Смотреть все товары ")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <p className="bu-subtitle">
              {translateText("Выпечка магазинов с активной подпиской BakeU.")}
            </p>
          </div>

          <div className="bu-search">
            <Search size={20} aria-hidden="true" />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translateText("Торт, печенье, хлеб…")}
              aria-label={translateText("Поиск товаров")}
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={translateText("Очистить поиск")}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        <div
          className="bu-categories"
          aria-label={translateText("Категории товаров")}
        >
          {categories.map((item) => {
            const count = featured.filter(
              (product) =>
                item.name === "Все" || product.category === item.name,
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
                <span aria-hidden="true">{translateText(item.icon)}</span>
                {translateText(item.name)}
                <span className="bu-category__count">{count}</span>
              </button>
            );
          })}
        </div>

        {demo && (
          <p className="bu-demo">
            {translateText(
              "Демо-витрина: подписки магазинов показаны для примера.",
            )}
          </p>
        )}
        <div className="bu-results">
          <span>
            {translateText(isFiltered ? "Найдено товаров" : "Всего товаров")}:{" "}
            <strong>{visibleProducts.length}</strong>
          </span>

          {isFiltered && (
            <button type="button" onClick={resetFilters}>
              {translateText("Сбросить фильтры")}
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
                  <Link
                    to={"/product/" + encodeURIComponent(product.id)}
                    aria-label={translateText("Подробнее: " + product.name)}
                  >
                    <img
                      src={product.image}
                      alt={translateText(product.name)}
                      loading="lazy"
                    />
                  </Link>
                  <FavoriteButton product={product} />
                  {quantity > 0 && (
                    <span className="bu-product__quantity">
                      <Check size={13} aria-hidden="true" />
                      {translateText("В корзине:")} {quantity}
                    </span>
                  )}
                </div>

                <div className="bu-product__body">
                  <Link
                    to={`/profile?shop=${encodeURIComponent(product.sellerId)}`}
                    className="bu-shop-link"
                  >
                    {translateText(product.sellerName)}
                  </Link>
                  <span className="bu-product__category">
                    {translateText(product.category)}
                  </span>

                  <h3>
                    <Link to={"/product/" + encodeURIComponent(product.id)}>
                      {translateText(product.name)}
                    </Link>
                  </h3>

                  <div className="bu-product__bottom">
                    <span className="bu-product__price">
                      {translateText(product.price.toLocaleString(getLocale()))}
                      <small>{translateText("сум")}</small>
                    </span>

                    <button
                      type="button"
                      className="bu-product__add"
                      onClick={() => handleAdd(product)}
                      aria-label={translateText(
                        `Добавить в корзину: ${product.name}`,
                      )}
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
            <h3>{translateText("Пока ничего не нашли")}</h3>
            <p>
              {translateText(
                "Попробуйте другое название или выберите все категории.",
              )}
            </p>

            <button
              type="button"
              className="bu-button bu-button--primary"
              onClick={resetFilters}
            >
              {translateText("Сбросить фильтры")}
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
              <span>{translateText(notice)}</span>
            </>
          )}
        </div>
      </section>
      <section className="bu-discover" aria-labelledby="bu-discover-title">
        <div className="bu-discover__intro">
          <span className="bu-overline">
            {translateText("ВДОХНОВЕНИЕ НА КАЖДЫЙ ДЕНЬ")}
          </span>
          <h2 id="bu-discover-title">
            {translateText("Найдите свой")}
            <br />
            <span>{translateText("любимый вкус.")}</span>
          </h2>
          <p>
            {translateText(
              "От хрустящего хлеба до любимого десерта — всё от домашних мастеров.",
            )}
          </p>
          <Link
            to="/seller?tab=products"
            className="bu-button bu-button--primary"
          >
            {translateText("Выбрать вкусное ")}
            <ArrowRight size={18} />
          </Link>
        </div>
        <HeroSlider />
      </section>
      <section className="bu-makers" aria-labelledby="bu-makers-title">
        <div className="bu-makers__heading">
          <div>
            <span className="bu-overline">
              {translateText("ЛЮДИ, КОТОРЫЕ ПЕКУТ С ЛЮБОВЬЮ")}
            </span>
            <h2 id="bu-makers-title">
              {translateText("Знакомьтесь, кондитеры")}
            </h2>
          </div>
          <Link to="/seller?tab=sellers">
            {translateText("Все продавцы ")}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="bu-makers__grid">
          {[
            {
              id: "shahzoda",
              name: "Shahzoda Family",
              initials: "SF",
              description: "Торты для ваших особенных моментов",
              image: "cake",
              color: "#ead9b9",
            },
            {
              id: "sweet-home",
              name: "Sweet Home",
              initials: "SH",
              description: "Печенье и сладости к любимому чаю",
              image: "cookie",
              color: "#ead9e1",
            },
            {
              id: "bakeu",
              name: "BakeU Bakery",
              initials: "BU",
              description: "Домашний хлеб и ароматная самса",
              image: "bread",
              color: "#dce6d5",
            },
          ].map((shop) => (
            <Link
              key={shop.id}
              className="bu-maker"
              to={`/profile?shop=${shop.id}`}
              aria-label={translateText(`Открыть профиль: ${shop.name}`)}
            >
              <span
                className="bu-maker__avatar"
                style={{ background: shop.color }}
              >
                {translateText(shop.initials)}
              </span>
              <span className="bu-maker__info">
                <strong>{translateText(shop.name)}</strong>
                <span>{translateText(shop.description)}</span>
                <small>{translateText("Открыть профиль ↗")}</small>
              </span>
              <img
                src={`/images/products/${shop.image}.jpg`}
                alt=""
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      </section>
      <Link to="/ai" className="bu-helper">
        <span className="bu-helper__icon" aria-hidden="true">
          ✦
        </span>
        <span>
          <strong>{translateText("Не знаете, что выбрать?")}</strong>
          <small>
            {translateText("Расскажите помощнику BakeU, чего хочется сегодня.")}
          </small>
        </span>
        <span className="bu-helper__action">
          {translateText("Спросить помощника ")}
          <ArrowUpRight size={20} />
        </span>
      </Link>
    </main>
  );
}

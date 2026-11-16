import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChefHat,
  Gift,
  Heart,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Snowflake,
  Sparkles,
  X,
} from "lucide-react";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { getLocale, translateText as t } from "../../i18n/index.js";
import {
  demoProducts,
  demoSubscriptions,
  eligibleProducts,
} from "../../store/homeData";
import { useCartStore } from "../../store/cartStore";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import "./Home.css";

const categories = [
  { name: "Все", icon: "✦" },
  { name: "Торты", icon: "🍰" },
  { name: "Печенье", icon: "🍪" },
  { name: "Хлеб", icon: "🥖" },
  { name: "Самса", icon: "🥟" },
];
const makers = [
  {
    id: "shahzoda",
    name: "Shahzoda Family",
    description: "Торты для ваших особенных моментов",
    image: "cake",
    initials: "SF",
  },
  {
    id: "sweet-home",
    name: "Sweet Home",
    description: "Печенье и сладости к любимому чаю",
    image: "cookie",
    initials: "SH",
  },
  {
    id: "bakeu",
    name: "BakeU Bakery",
    description: "Домашний хлеб и ароматная самса",
    image: "bread",
    initials: "BU",
  },
];

export default function Home({
  catalog = demoProducts,
  subscriptions = demoSubscriptions,
  demo = true,
}) {
  const [now, setNow] = useState(Date.now);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState("");
  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const featured = eligibleProducts(catalog, subscriptions, now);
  const visibleProducts = featured.filter(
    (product) =>
      (category === "Все" || product.category === category) &&
      normalizeSearch(
        `${product.name} ${t(product.name)} ${product.sellerName}`,
      ).includes(normalizeSearch(query)),
  );
  const isFiltered = query.trim() !== "" || category !== "Все";
  function resetFilters() {
    setQuery("");
    setCategory("Все");
  }
  function openCatalog(nextCategory = "Все") {
    setQuery("");
    setCategory(nextCategory);
    document.getElementById("home-catalog")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  function handleAdd(product) {
    try {
      add(product);
      setNotice(`Добавлено в корзину: ${product.name}`);
    } catch {
      setNotice("Не удалось сохранить корзину.");
    }
  }

  return (
    <main className="bu-home">
      <section className="bu-hero" aria-labelledby="bu-hero-title">
        <div className="bu-hero__content">
          <span className="bu-eyebrow">
            <Snowflake size={15} aria-hidden="true" />
            {t("ЗИМНЯЯ КОЛЛЕКЦИЯ BAKEU")}
          </span>
          <h1 id="bu-hero-title">
            {t("Уютная зима.")}
            <br />
            <em>{t("Вкусные моменты.")}</em>
          </h1>
          <p className="bu-hero__description">
            {t(
              "Торты, десерты и выпечка от местных мастеров. Найдите что-нибудь особенное на BakeU.",
            )}
          </p>
          <div className="bu-hero__actions">
            <button
              type="button"
              className="bu-button bu-button--primary"
              onClick={() => openCatalog()}
            >
              {t("Выбрать вкусное")}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <Link to="/map" className="bu-button bu-button--secondary">
              <MapPin size={18} aria-hidden="true" />
              {t("Найти рядом")}
            </Link>
          </div>
          <div className="bu-hero__signature">
            <span className="bu-signature-icon">
              <Heart size={17} aria-hidden="true" />
            </span>
            <span>
              {t("С любовью к вкусному ♡")}
              <small>{t("От местных мастеров — к вашему столу")}</small>
            </span>
          </div>
        </div>
        <div className="bu-hero__gallery">
          <span
            className="bu-hero__sparkle bu-hero__sparkle--one"
            aria-hidden="true"
          >
            ✳
          </span>
          <button
            type="button"
            className="bu-feature bu-feature--cake"
            onClick={() => openCatalog("Торты")}
            aria-label={t("Посмотреть торты")}
          >
            <img
              src="/images/products/cake.jpg"
              alt={t("Шоколадный торт")}
              fetchPriority="high"
              width="1254"
              height="1254"
            />
            <span className="bu-feature__caption">
              <span>{t("Для особого повода")}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </span>
          </button>
          <button
            type="button"
            className="bu-feature bu-feature--cookie"
            onClick={() => openCatalog("Печенье")}
            aria-label={t("Посмотреть печенье")}
          >
            <img
              src="/images/products/cookie.jpg"
              alt={t("Домашнее печенье")}
              width="1254"
              height="1254"
            />
            <span className="bu-feature__caption">
              <span>{t("К любимому чаю")}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </button>
          <span className="bu-winter-note">
            <Gift size={17} aria-hidden="true" />
            {t("Немного праздника каждый день")}
          </span>
          <img
            className="bu-snowman"
            src="/images/winter/snowman.png"
            alt=""
            aria-hidden="true"
            width="1024"
            height="1536"
          />
          <span
            className="bu-hero__sparkle bu-hero__sparkle--two"
            aria-hidden="true"
          >
            ✧
          </span>
        </div>
      </section>

      <div className="bu-season-line" aria-label={t("Зима с BakeU")}>
        <span>
          <ChefHat size={18} aria-hidden="true" />
          {t("Местные мастера")}
        </span>
        <span>
          <Heart size={18} aria-hidden="true" />
          {t("Приготовлено с душой")}
        </span>
        <span>
          <Gift size={18} aria-hidden="true" />
          {t("Для тёплых встреч")}
        </span>
      </div>

      <section
        id="home-catalog"
        className="bu-catalog"
        aria-labelledby="bu-catalog-title"
      >
        <div className="bu-catalog__top">
          <div>
            <span className="bu-overline">{t("ВИТРИНА МАСТЕРОВ")}</span>
            <h2 id="bu-catalog-title">{t("Что-то вкусное для вас")}</h2>
            <p className="bu-subtitle">
              {t("Выбирайте сердцем. Остальное приготовят мастера.")}
            </p>
          </div>
          <Link className="bu-all-products" to="/seller?tab=products">
            {t("Смотреть все товары")}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="bu-catalog__toolbar">
          <div
            className="bu-categories"
            role="group"
            aria-label={t("Категории товаров")}
          >
            {categories.map((item) => {
              const count = featured.filter(
                (p) => item.name === "Все" || p.category === item.name,
              ).length;
              return (
                <button
                  key={item.name}
                  type="button"
                  className={`bu-category${category === item.name ? " is-active" : ""}`}
                  aria-pressed={category === item.name}
                  onClick={() => setCategory(item.name)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {t(item.name)}
                  <span className="bu-category__count">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="bu-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Торт, печенье, хлеб…")}
              aria-label={t("Поиск товаров")}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("Очистить поиск")}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="bu-results" aria-live="polite">
          <span>
            {t(isFiltered ? "Найдено товаров" : "Всего товаров")}:{" "}
            <strong>{visibleProducts.length}</strong>
          </span>
          {isFiltered && (
            <button type="button" onClick={resetFilters}>
              {t("Сбросить фильтры")}
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="bu-products">
          {visibleProducts.map((product) => {
            const quantity = items?.[product.id] ?? 0;
            return (
              <article className="bu-product" key={product.id}>
                <div className="bu-product__image">
                  <Link
                    to={`/product/${encodeURIComponent(product.id)}`}
                    aria-label={t("Подробнее: " + product.name)}
                  >
                    <img
                      src={product.image}
                      alt={t(product.name)}
                      loading="lazy"
                      width="1254"
                      height="1254"
                    />
                  </Link>
                  <FavoriteButton product={product} />
                  {quantity > 0 && (
                    <span className="bu-product__quantity">
                      <Check size={13} aria-hidden="true" />
                      {t("В корзине:")} {quantity}
                    </span>
                  )}
                </div>
                <div className="bu-product__body">
                  <div className="bu-product__meta">
                    <span className="bu-product__category">
                      {t(product.category)}
                    </span>
                    <Link
                      to={`/profile?shop=${encodeURIComponent(product.sellerId)}`}
                      className="bu-shop-link"
                    >
                      {t(product.sellerName)}
                    </Link>
                  </div>
                  <h3>
                    <Link to={`/product/${encodeURIComponent(product.id)}`}>
                      {t(product.name)}
                    </Link>
                  </h3>
                  <div className="bu-product__bottom">
                    <span className="bu-product__price">
                      {product.price.toLocaleString(getLocale())}
                      <small>{t("сум")}</small>
                    </span>
                    <button
                      type="button"
                      className="bu-product__add"
                      onClick={() => handleAdd(product)}
                      aria-label={t(`Добавить в корзину: ${product.name}`)}
                    >
                      <Plus size={19} aria-hidden="true" />
                      <span>{t("В корзину")}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {visibleProducts.length === 0 && (
          <div className="bu-empty">
            <Search size={32} aria-hidden="true" />
            <h3>{t("Пока ничего не нашли")}</h3>
            <p>{t("Попробуйте другое название или выберите все категории.")}</p>
            <button
              type="button"
              className="bu-button bu-button--primary"
              onClick={resetFilters}
            >
              {t("Сбросить фильтры")}
            </button>
          </div>
        )}
        {demo && (
          <p className="bu-demo">
            {t("Демо-витрина: подписки магазинов показаны для примера.")}
          </p>
        )}
      </section>

      <Link to="/map" className="bu-map">
        <span className="bu-map__icon">
          <MapPin size={24} aria-hidden="true" />
        </span>
        <span className="bu-map__text">
          <strong>{t("Вкусное ближе, чем кажется")}</strong>
          <span>{t("Откройте карту и найдите мастеров рядом")}</span>
        </span>
        <span className="bu-map__action">
          {t("Открыть карту")}
          <ArrowUpRight size={21} aria-hidden="true" />
        </span>
      </Link>

      <section className="bu-gather" aria-labelledby="bu-gather-title">
        <div className="bu-gather__photos">
          <img
            src="/images/products/bread.jpg"
            alt={t("Домашний хлеб")}
            loading="lazy"
            width="1254"
            height="1254"
          />
          <img
            src="/images/products/cookie.jpg"
            alt={t("Домашнее печенье")}
            loading="lazy"
            width="1254"
            height="1254"
          />
          <span className="bu-gather__stamp" aria-hidden="true">
            <Snowflake size={23} />
            BakeU
            <br />
            {t("С любовью")}
          </span>
        </div>
        <div className="bu-gather__copy">
          <span className="bu-overline">
            {t("МАЛЕНЬКИЕ РАДОСТИ КАЖДЫЙ ДЕНЬ")}
          </span>
          <h2 id="bu-gather-title">
            {t("Повод собраться")}
            <br />
            <em>{t("найдётся всегда.")}</em>
          </h2>
          <p>
            {t(
              "Чашка чая, любимые люди и что-нибудь свежее из печи. Именно из таких мелочей складывается уют.",
            )}
          </p>
          <Link to="/seller?tab=products" className="bu-text-link">
            {t("Найдите свой любимый вкус")}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="bu-makers" aria-labelledby="bu-makers-title">
        <div className="bu-makers__heading">
          <div>
            <span className="bu-overline">
              {t("ЛЮДИ, КОТОРЫЕ ПЕКУТ С ЛЮБОВЬЮ")}
            </span>
            <h2 id="bu-makers-title">{t("Знакомьтесь, кондитеры")}</h2>
          </div>
          <Link className="bu-all-products" to="/seller?tab=sellers">
            {t("Все продавцы")}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="bu-makers__grid">
          {makers.map((shop) => (
            <Link
              key={shop.id}
              className="bu-maker"
              to={`/profile?shop=${shop.id}`}
              aria-label={t(`Открыть профиль: ${shop.name}`)}
            >
              <img
                src={`/images/products/${shop.image}.jpg`}
                alt=""
                loading="lazy"
                width="1254"
                height="1254"
              />
              <span className="bu-maker__info">
                <span className="bu-maker__avatar" aria-hidden="true">
                  {shop.initials}
                </span>
                <strong>{shop.name}</strong>
                <span>{t(shop.description)}</span>
                <small>
                  {t("Открыть профиль")}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </small>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <Link to="/ai" className="bu-helper">
        <span className="bu-helper__icon">
          <Sparkles size={27} aria-hidden="true" />
        </span>
        <span>
          <strong>{t("Не знаете, что выбрать?")}</strong>
          <small>
            {t("Расскажите помощнику BakeU, чего хочется сегодня.")}
          </small>
        </span>
        <span className="bu-helper__action">
          {t("Спросить помощника")}
          <ArrowUpRight size={20} aria-hidden="true" />
        </span>
      </Link>
      <button
        type="button"
        className="bu-back-catalog"
        onClick={() => openCatalog()}
      >
        {t("Вернуться к вкусному")}
        <ArrowUp size={15} aria-hidden="true" />
      </button>
      <div
        className={`bu-notice${notice ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice && (
          <>
            <ShoppingBag size={17} aria-hidden="true" />
            <span>{t(notice)}</span>
          </>
        )}
      </div>
    </main>
  );
}

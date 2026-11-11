import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
    logo: "",
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
    logo: "",
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
    logo: "",
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

const shopUrl = (id) => `?shop=${encodeURIComponent(id)}`;

function ShopLogo({ shop }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className="seller-shop__logo"
      style={{ "--shop-color": shop.color }}
      aria-hidden="true"
    >
      {shop.logo && !failed ? (
        <img
          src={shop.logo}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        shop.initials
      )}
    </span>
  );
}

function ShopRating({ shop }) {
  return (
    <div className="seller-shop__rating">
      <Star size={14} fill="currentColor" aria-hidden="true" />
      <strong>{shop.rating}</strong>
      <span>Оценок: {shop.reviewsCount}</span>
    </div>
  );
}

function ProductCard({ product, quantity, onAdd }) {
  const shop = shops.find((item) => item.id === product.shopId);

  return (
    <article className="seller-product">
      <div className="seller-product__image">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width="400"
          height="350"
        />

        {quantity > 0 && (
          <span className="seller-product__count">
            В корзине: {quantity}
          </span>
        )}
      </div>

      <div className="seller-product__body">
        <Link
          to={shopUrl(product.shopId)}
          className="seller-product__shop"
        >
          <Store size={13} aria-hidden="true" />
          {shop?.name}
        </Link>

        <h2>{product.name}</h2>

        <div className="seller-product__bottom">
          <strong>{formatPrice(product.price)}</strong>

          <button
            type="button"
            className="seller-product__add"
            onClick={() => onAdd(product)}
            aria-label={`Добавить в корзину: ${product.name}`}
          >
            <Plus size={21} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function ShopCard({ shop }) {
  const shopProducts = products.filter(
    (product) => product.shopId === shop.id
  );

  return (
    <article className="seller-shop">
      <Link to={shopUrl(shop.id)} className="seller-shop__top">
        <ShopLogo shop={shop} />

        <div className="seller-shop__identity">
          <h2>{shop.name}</h2>
          <ShopRating shop={shop} />
        </div>

        <ArrowUpRight
          className="seller-shop__arrow"
          size={18}
          aria-hidden="true"
        />
      </Link>

      <p className="seller-shop__description">
        {shop.description}
      </p>

      <div className="seller-shop__preview-heading">
        <span>Витрина</span>
        <span>Товаров: {shopProducts.length}</span>
      </div>

      <div className="seller-shop__previews">
        {shopProducts.slice(0, 3).map((product) => (
          <Link
            key={product.id}
            to={shopUrl(shop.id)}
            className="seller-shop__preview"
            aria-label={`${product.name} — открыть магазин ${shop.name}`}
          >
            <img
              src={product.image}
              alt=""
              loading="lazy"
              width="100"
              height="76"
            />

            <strong>{formatPrice(product.price)}</strong>
          </Link>
        ))}
      </div>

      <blockquote className="seller-shop__review">
        <p>«{shop.review.text}»</p>
        <footer>{shop.review.author} · пример отзыва</footer>
      </blockquote>

      <Link to={shopUrl(shop.id)} className="seller-shop__open">
        Открыть профиль
        <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

export default function Seller() {
  const [params] = useSearchParams();
  const shopId = params.get("shop");

  const tab =
    params.get("tab") === "sellers" ? "sellers" : "products";

  // При переходе между каталогом и профилями
  // поиск и фильтры получают отдельное состояние.
  const viewKey = shopId ? `shop:${shopId}` : tab;

  return (
    <SellerView
      key={viewKey}
      tab={tab}
      shopId={shopId}
    />
  );
}

function SellerView({ tab, shopId }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState("");

  const add = useCartStore((state) => state.add);
  const items = useCartStore((state) => state.items);

  const shop = shops.find((item) => item.id === shopId);
  const isProfile = shopId !== null;
  const showSellers = !isProfile && tab === "sellers";

  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  const shopProducts = shop
    ? products.filter((product) => product.shopId === shop.id)
    : products;

  const availableCategories = isProfile
    ? [
        "Все",
        ...new Set(shopProducts.map((product) => product.category)),
      ]
    : categories;

  const visibleProducts = shopProducts.filter((product) => {
    const owner = shops.find((item) => item.id === product.shopId);

    return (
      `${product.name} ${owner?.name ?? ""}`
        .toLocaleLowerCase("ru-RU")
        .includes(normalizedQuery) &&
      (category === "Все" || category === product.category)
    );
  });

  const visibleShops = shops.filter((item) => {
    const names = products
      .filter((product) => product.shopId === item.id)
      .map((product) => product.name)
      .join(" ");

    return `${item.name} ${item.description} ${names}`
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery);
  });

  function resetFilters() {
    setQuery("");
    setCategory("Все");
  }

  function addProduct(product) {
    add(product.id);
    setNotice(`Добавлено в корзину: ${product.name}`);
  }

  if (isProfile && !shop) {
    return (
      <main className="seller-page">
        <div className="seller-empty">
          <Store size={30} aria-hidden="true" />
          <h1>Магазин не найден</h1>
          <p>Проверьте ссылку или выберите другой магазин.</p>

          <Link className="seller-back" to="?tab=sellers">
            <ArrowLeft size={16} aria-hidden="true" />
            Все продавцы
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="seller-page">
      {isProfile ? (
        <>
          <Link to="?tab=sellers" className="seller-back">
            <ArrowLeft size={17} aria-hidden="true" />
            Все продавцы
          </Link>

          <section
            className="seller-profile"
            aria-labelledby="seller-profile-title"
          >
            <div className="seller-profile__identity">
              <ShopLogo shop={shop} />

              <div>
                <span className="seller-eyebrow">
                  ПРОФИЛЬ МАГАЗИНА
                </span>

                <h1 id="seller-profile-title">{shop.name}</h1>
                <ShopRating shop={shop} />
              </div>
            </div>

            <p className="seller-profile__description">
              {shop.description}
            </p>

            <div className="seller-profile__actions">
              <a className="seller-pill" href="#seller-products">
                <ShoppingBag size={17} aria-hidden="true" />
                Товары · {shopProducts.length}
              </a>

              <a className="seller-pill" href="#seller-reviews">
                <Star size={16} aria-hidden="true" />
                Отзывы
              </a>
            </div>
          </section>
        </>
      ) : (
        <nav className="seller-tabs" aria-label="Раздел каталога">
          <Link
            to="?tab=sellers"
            className={showSellers ? "is-active" : ""}
            aria-current={showSellers ? "page" : undefined}
          >
            <Store size={19} aria-hidden="true" />
            Продавцы
          </Link>

          <Link
            to="?tab=products"
            className={!showSellers ? "is-active" : ""}
            aria-current={!showSellers ? "page" : undefined}
          >
            <ShoppingBag size={19} aria-hidden="true" />
            Товары
          </Link>
        </nav>
      )}

      <div className="seller-heading" id="seller-products">
        <div>
          {!isProfile && (
            <span className="seller-eyebrow">
              СДЕЛАНО С ЛЮБОВЬЮ
            </span>
          )}

          {isProfile ? (
            <h2>Витрина магазина</h2>
          ) : (
            <h1>
              {showSellers
                ? "Знакомьтесь с мастерами"
                : "Найдите своё любимое"}
            </h1>
          )}

          {!isProfile && (
            <p>
              {showSellers
                ? "Маленькие магазины с большим вниманием к вкусу."
                : "Торты, десерты и домашняя выпечка в одном месте."}
            </p>
          )}
        </div>

        <label className="seller-search">
          <Search size={19} aria-hidden="true" />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              showSellers ? "Найти магазин…" : "Найти вкусное…"
            }
            aria-label={
              showSellers ? "Поиск магазинов" : "Поиск товаров"
            }
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Очистить поиск"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <p className="seller-demo">
        Демо-каталог: магазины, рейтинги и отзывы приведены для примера.
      </p>

      {showSellers ? (
        <section className="seller-shops" aria-label="Продавцы">
          {visibleShops.map((item) => (
            <ShopCard key={item.id} shop={item} />
          ))}

          {visibleShops.length === 0 && (
            <div className="seller-empty">
              <Store size={28} aria-hidden="true" />
              <h2>Магазины не найдены</h2>
              <p>Попробуйте другое название.</p>

              <button
                type="button"
                className="seller-pill"
                onClick={resetFilters}
              >
                Сбросить поиск
              </button>
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Товары">
          <div className="seller-categories">
            {availableCategories.map((item) => (
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

            {(query || category !== "Все") && (
              <button type="button" onClick={resetFilters}>
                Сбросить фильтры
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="seller-products">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={items?.[product.id] ?? 0}
                onAdd={addProduct}
              />
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div className="seller-empty">
              <Search size={28} aria-hidden="true" />
              <h2>Товары не найдены</h2>
              <p>Попробуйте другое название или категорию.</p>

              <button
                type="button"
                className="seller-pill"
                onClick={resetFilters}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </section>
      )}

      <p className="seller-notice" role="status">
        {notice}
      </p>

      {isProfile && (
        <section
          className="seller-reviews"
          id="seller-reviews"
          aria-labelledby="seller-reviews-title"
        >
          <div className="seller-reviews__heading">
            <h2 id="seller-reviews-title">Отзывы покупателей</h2>
            <ShopRating shop={shop} />
          </div>

          <p className="seller-demo">
            Ниже показан один демонстрационный отзыв.
          </p>

          <blockquote className="seller-profile-review">
            <p>«{shop.review.text}»</p>
            <footer>{shop.review.author} · пример отзыва</footer>
          </blockquote>
        </section>
      )}
    </main>
  );
}
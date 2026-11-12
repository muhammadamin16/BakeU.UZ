import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, MessageCircle, Phone, Send, MapPin,
  Clock, Star, Store, ShoppingBag, Search, X,
} from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import { products, getShop } from "./sellerData";
import { ShopLogo, ProductCard } from "./SellerParts";
import "./Seller.css";
import "./SellerShop.css";

function InstagramIcon({ size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function Stars({ value }) {
  return (
    <span className="shop-stars" aria-label={`Оценка: ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} fill={n <= value ? "currentColor" : "none"} aria-hidden="true" />
      ))}
    </span>
  );
}

export default function SellerShop({ shopId }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [notice, setNotice] = useState("");

  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);

  const shop = getShop(shopId);

  if (!shop) {
    return (
      <main className="seller-page">
        <div className="seller-empty">
          <Store size={30} aria-hidden="true" />
          <h1>Магазин не найден</h1>
          <p>Проверьте ссылку или выберите другой магазин.</p>
          <Link className="seller-back" to="?tab=sellers">
            <ArrowLeft size={16} aria-hidden="true" /> Все продавцы
          </Link>
        </div>
      </main>
    );
  }

  const shopProducts = products.filter((p) => p.shopId === shop.id);
  const cats = ["Все", ...new Set(shopProducts.map((p) => p.category))];
  const q = query.trim().toLocaleLowerCase("ru-RU");

  const visible = shopProducts.filter(
    (p) =>
      p.name.toLocaleLowerCase("ru-RU").includes(q) &&
      (category === "Все" || p.category === category)
  );

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const addProduct = (product) => {
    add(product.id);
    setNotice(`Добавлено в корзину: ${product.name}`);
  };

  const contacts = [
    shop.phone && {
      key: "phone",
      icon: Phone,
      label: "Телефон",
      value: shop.phone,
      href: `tel:${shop.phone.replace(/[^\d+]/g, "")}`,
    },
    shop.telegram && {
      key: "tg",
      icon: Send,
      label: "Telegram",
      value: `@${shop.telegram}`,
      href: `https://t.me/${shop.telegram}`,
      external: true,
    },
    shop.instagram && {
      key: "ig",
      icon: InstagramIcon,
      label: "Instagram",
      value: `@${shop.instagram}`,
      href: `https://instagram.com/${shop.instagram}`,
      external: true,
    },
  ].filter(Boolean);

  return (
    <main className="seller-page">
      <Link to="?tab=sellers" className="seller-back">
        <ArrowLeft size={17} aria-hidden="true" /> Все продавцы
      </Link>

      {/* ШАПКА */}
      <section className="shop-hero" aria-labelledby="shop-title">
        <div className="shop-hero__cover" style={{ "--shop-color": shop.color }} />

        <div className="shop-hero__body">
          <ShopLogo shop={shop} />

          <div className="shop-hero__info">
            <span className="seller-eyebrow">ПРОФИЛЬ МАГАЗИНА</span>
            <h1 id="shop-title">{shop.name}</h1>
            <div className="shop-hero__meta">
              <span className="shop-hero__rating">
                <Star size={15} fill="currentColor" aria-hidden="true" />
                <strong>{shop.rating}</strong>
                <span>· {shop.reviewsCount} оценок</span>
              </span>
              <span className="shop-hero__meta-item">
                <MapPin size={14} aria-hidden="true" /> {shop.address}
              </span>
            </div>
          </div>

          <div className="shop-hero__actions">
            <Link to={`/messages?seller=${shop.id}`} className="shop-btn shop-btn--primary">
              <MessageCircle size={18} aria-hidden="true" />
              Написать в чат
            </Link>
            {shop.phone && (
              <a href={`tel:${shop.phone.replace(/[^\d+]/g, "")}`} className="shop-btn">
                <Phone size={17} aria-hidden="true" />
                Позвонить
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ВКЛАДКИ-ЯКОРЯ */}
      <div className="shop-nav">
        <button type="button" onClick={() => scrollTo("shop-about")}>О магазине</button>
        <button type="button" onClick={() => scrollTo("shop-products")}>Товары · {shopProducts.length}</button>
        <button type="button" onClick={() => scrollTo("shop-reviews")}>Отзывы · {shop.reviews.length}</button>
      </div>

      <div className="shop-layout">
        {/* САЙДБАР */}
        <aside className="shop-aside">
          <section className="shop-card">
            <h2>Контакты</h2>
            <ul className="shop-contacts">
              {contacts.map(({ key, icon: Icon, label, value, href, external }) => (
                <li key={key}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    <span className="shop-contacts__icon"><Icon size={18} aria-hidden="true" /></span>
                    <span className="shop-contacts__text">
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="shop-card">
            <h2>Адрес и время работы</h2>
            <div className="shop-location">
              <span className="shop-contacts__icon"><MapPin size={18} aria-hidden="true" /></span>
              <div>
                <strong>{shop.address}</strong>
                {shop.mapUrl && (
                  <a href={shop.mapUrl} target="_blank" rel="noopener noreferrer" className="shop-link">
                    Открыть на карте
                  </a>
                )}
              </div>
            </div>
            <div className="shop-location">
              <span className="shop-contacts__icon"><Clock size={18} aria-hidden="true" /></span>
              <div><strong>{shop.hours}</strong></div>
            </div>
          </section>
        </aside>

        {/* ОСНОВНАЯ КОЛОНКА */}
        <div className="shop-main">
          <section className="shop-card" id="shop-about">
            <h2>О магазине</h2>
            <p className="shop-about">{shop.about}</p>
          </section>

          <section id="shop-products" className="shop-section">
            <div className="seller-heading shop-section__head">
              <h2>Витрина магазина</h2>
              <label className="seller-search">
                <Search size={19} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Найти вкусное…"
                  aria-label="Поиск товаров"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Очистить поиск">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </label>
            </div>

            {cats.length > 2 && (
              <div className="seller-categories">
                {cats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={category === c ? "is-active" : ""}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="shop-products">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} quantity={items?.[p.id] ?? 0} onAdd={addProduct} />
              ))}
            </div>

            {visible.length === 0 && (
              <div className="seller-empty">
                <ShoppingBag size={28} aria-hidden="true" />
                <h2>Товары не найдены</h2>
                <p>Попробуйте другое название.</p>
              </div>
            )}

            <p className="seller-notice" role="status">{notice}</p>
          </section>

          <section className="shop-card" id="shop-reviews">
            <div className="shop-reviews__head">
              <h2>Отзывы покупателей</h2>
              <span className="shop-hero__rating">
                <Star size={15} fill="currentColor" aria-hidden="true" />
                <strong>{shop.rating}</strong>
                <span>· {shop.reviewsCount} оценок</span>
              </span>
            </div>
            <p className="seller-demo">Отзывы приведены для примера.</p>

            <ul className="shop-reviews">
              {shop.reviews.map((r) => (
                <li key={r.id} className="shop-review">
                  <div className="shop-review__top">
                    <span className="shop-review__avatar">{r.author[0]}</span>
                    <div>
                      <strong>{r.author}</strong>
                      <small>{r.date}</small>
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
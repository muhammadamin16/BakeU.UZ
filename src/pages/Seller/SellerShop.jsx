import { translateText } from "../../i18n/index.js";
import { useWorkspace, followShop } from "../../store/workspaceStore";
import { accountId } from "../../store/localAccount";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Send,
  Camera,
  Share2,
  ShoppingBag,
  Info,
  Clock,
  Package,
  Truck,
  CalendarDays,
  Wallet,
  Pencil,
  X,
  CheckCircle2,
  Store,
  Search,
} from "lucide-react";

import { useCatalog, getShop, getMapLinks } from "../../store/sellerData";
import { ProductCard, ShopLogo } from "./SellerParts";
import { useCartStore } from "../../store/cartStore";

import "./Seller.css";
import "./SellerShop.css";

export default function SellerShop({ shopId }) {
  return <ShopProfile key={shopId} shopId={shopId} />;
}
function ShopProfile({ shopId }) {
  const shop = getShop(shopId);
  const { products } = useCatalog();
  const navigate = useNavigate();
  let account = null;
  try {
    account = JSON.parse(
      sessionStorage.getItem("bakeu-demo-profile") || "null",
    );
  } catch {
    /* A missing browser profile means guest access. */
  }
  const follows = useWorkspace((s) => s.follows);
  const isFollowing =
    !!account &&
    follows.some(
      (f) => f.buyerId === accountId(account) && f.shopId === shopId,
    );
  function openChat() {
    navigate(
      account ? `/messages?seller=${encodeURIComponent(shopId)}` : "/login",
    );
  }

  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);

  const [activeTab, setActiveTab] = useState("products");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState(() => {
    try {
      return localStorage.getItem(`bakeu-review-draft-${shopId}`) || "";
    } catch {
      return "";
    }
  });
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const escape = (e) => {
      if (e.key === "Escape") {
        setReviewOpen(false);
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);

  useEffect(() => {
    if (!reviewOpen) return;
    const previous = document.activeElement;
    const dialog = document.querySelector(".shop-review-modal");
    const trap = (e) => {
      if (e.key !== "Tab") return;
      const nodes = dialog?.querySelectorAll("button, textarea");
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [reviewOpen]);

  if (!shop) {
    return (
      <main className="seller-page">
        <div className="seller-empty">
          <Store size={32} />
          <h2>{translateText("Магазин не найден")}</h2>
          <Link to="/seller?tab=sellers">{translateText("Все продавцы")}</Link>
        </div>
      </main>
    );
  }

  const shopProducts = products.filter((p) => p.shopId === shop.id);

  const categories = ["Все", ...new Set(shopProducts.map((p) => p.category))];

  const visibleProducts = shopProducts.filter((p) => {
    const matchesSearch = (p.name + " " + translateText(p.name))
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesCategory = category === "Все" || p.category === category;

    return matchesSearch && matchesCategory;
  });

  const mapLinks = getMapLinks(shop);

  const toggleSubscribe = () => {
    if (!account) {
      navigate("/login");
      return;
    }
    if (account.role !== "client") {
      setNotice("Подписаться можно из аккаунта покупателя");
      return;
    }
    try {
      followShop(account, shopId);
      setNotice(isFollowing ? "Вы отписались" : "Подписка сохранена");
    } catch {
      setNotice("Не удалось сохранить подписку");
    }
  };

  const shareShop = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shop.name,
          text: `${shop.name} — BakeU`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Ссылка скопирована!");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        setNotice(
          "Не удалось скопировать ссылку. Скопируйте адрес из браузера.",
        );
    }
  };

  const submitReview = (e) => {
    e.preventDefault();

    if (!reviewText.trim()) return;

    try {
      localStorage.setItem(`bakeu-review-draft-${shopId}`, reviewText.trim());
    } catch {
      setNotice("Не удалось сохранить черновик");
      return;
    }
    setNotice(
      "Черновик отзыва сохранён в этом браузере. Он ещё не опубликован.",
    );
    setReviewOpen(false);
  };

  const contactItems = [
    {
      title: "Чат BakeU",
      subtitle: "Написать магазину",
      icon: MessageCircle,
      href: null,
    },
    {
      title: "Telegram",
      subtitle: `@${shop.telegram}`,
      icon: Send,
      href: `https://t.me/${shop.telegram}`,
    },
    {
      title: "Instagram",
      subtitle: `@${shop.instagram}`,
      icon: Camera,
      href: `https://instagram.com/${shop.instagram}`,
    },
    {
      title: "Позвонить",
      subtitle: shop.phone,
      icon: Phone,
      href: `tel:${(shop.phone || "").replace(/[^+0-9]/g, "")}`,
    },
  ];

  const availableContacts = contactItems.filter(
    (c) =>
      c.title === "Чат BakeU" ||
      (c.title === "Telegram"
        ? shop.telegram
        : c.title === "Instagram"
          ? shop.instagram
          : shop.phone),
  );

  const tabItems = [
    { id: "products", title: "Товары", icon: ShoppingBag },
    { id: "about", title: "О магазине", icon: Info },
    { id: "reviews", title: "Отзывы", icon: Star },
    { id: "contacts", title: "Контакты", icon: MapPin },
  ];

  return (
    <main className="seller-page seller-shop-page">
      <div className="shop-breadcrumb">
        <Link to="/">{translateText("⌂ Главная")}</Link>
        <span>/</span>
        <Link to="/seller?tab=sellers">{translateText("Кондитеры")}</Link>
        <span>/</span>
        <strong>{translateText(shop.name)}</strong>
      </div>

      <section className="shop-profile-hero">
        <div
          className="shop-profile-cover"
          style={{ "--shop-color": shop.color }}
        >
          <img
            src={shop.banner || "/images/banners/shop-cover.png"}
            alt={translateText("Домашняя выпечка и приготовление десертов")}
            fetchPriority="high"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/images/banners/shop-cover.png";
            }}
          />
          <div className="shop-cover-overlay" />
        </div>

        <div className="shop-profile-body">
          <ShopLogo shop={shop} />

          <div className="shop-profile-info">
            <div className="shop-profile-name">
              <h1>{translateText(shop.name)}</h1>
              {shop.verified && (
                <CheckCircle2
                  size={21}
                  color="#bc6b25"
                  aria-label={translateText("Проверенный магазин")}
                />
              )}
            </div>

            <span className="shop-username">
              @{translateText(shop.telegram)}
            </span>

            <div className="shop-profile-meta">
              <span className="shop-meta-rating">
                <Star size={17} fill="currentColor" />
                <strong>{translateText(shop.rating)}</strong>
                <span>
                  ({translateText(shop.reviewsCount)}
                  {translateText(" отзывов)")}
                </span>
              </span>

              <span className="shop-meta-divider">|</span>

              <span className="shop-open-status">
                <i />
                {translateText(shop.hours)}
              </span>

              <span>
                <MapPin size={16} />
                {translateText(shop.address)}
              </span>
            </div>
          </div>

          <div className="shop-profile-actions">
            <button
              className="shop-profile-chat"
              type="button"
              onClick={openChat}
            >
              <MessageCircle size={17} />
              {translateText("Написать в чат")}
            </button>

            <button
              className={`shop-subscribe ${isFollowing ? "is-subscribed" : ""}`}
              type="button"
              onClick={toggleSubscribe}
              aria-pressed={isFollowing}
            >
              {isFollowing ? (
                <>
                  <CheckCircle2 size={17} />
                  {translateText("Вы подписаны")}
                </>
              ) : (
                translateText("Подписаться")
              )}
            </button>

            <button
              className="shop-share"
              type="button"
              onClick={shareShop}
              aria-label={translateText("Поделиться магазином")}
            >
              <Share2 size={19} />
            </button>
          </div>
        </div>
      </section>

      <div className="shop-page-grid">
        <div className="shop-page-main">
          <nav className="shop-page-nav">
            {tabItems.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "active" : ""}
                  aria-current={activeTab === tab.id ? "location" : undefined}
                  onClick={() => {
                    setActiveTab(tab.id);
                    document.getElementById(`shop-${tab.id}`)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  <Icon size={18} />
                  {translateText(tab.title)}
                </button>
              );
            })}
          </nav>

          <section className="shop-card shop-showcase" id="shop-products">
            <div className="shop-section-title">
              <h2>
                <Store size={20} />
                {translateText("Витрина магазина")}
              </h2>
              <span>
                {shopProducts.length}
                {translateText(" товаров")}
              </span>
            </div>

            <div className="shop-product-tools">
              <label className="shop-product-search">
                <Search size={17} />
                <input
                  type="search"
                  placeholder={translateText("Поиск по товарам магазина...")}
                  aria-label={translateText("Поиск по товарам магазина")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <div className="shop-filter-list">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={category === item ? "active" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {translateText(item)}
                  </button>
                ))}
              </div>
            </div>

            <div className="shop-products">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={items?.[product.id] ?? 0}
                  onAdd={(item) => {
                    add(item);
                    setNotice(`${item.name} добавлен в корзину`);
                  }}
                />
              ))}
            </div>

            {visibleProducts.length === 0 && (
              <div className="shop-no-products">
                <ShoppingBag size={30} />
                <strong>{translateText("Товары не найдены")}</strong>
                <span>
                  {translateText("Попробуйте изменить поиск или категорию.")}
                </span>
              </div>
            )}
          </section>

          <section className="shop-card shop-about-card" id="shop-about">
            <div className="shop-section-title">
              <h2>
                <Info size={21} />
                {translateText("О магазине")}
              </h2>
              <span className="shop-decoration">♡</span>
            </div>

            <p>{translateText(shop.about)}</p>
            <p>{translateText(shop.description)}</p>
          </section>

          <section className="shop-card shop-reviews-card" id="shop-reviews">
            <div className="shop-reviews-heading">
              <h2>
                <Star size={22} />
                {translateText("Отзывы покупателей")}
              </h2>

              <button type="button" onClick={() => setReviewOpen(true)}>
                <Pencil size={15} />
                {translateText("Написать отзыв")}
              </button>
            </div>

            <div className="shop-reviews-summary">
              <strong>{translateText(shop.rating)}</strong>
              <span className="shop-big-stars">★★★★★</span>
              <small>
                ({translateText(shop.reviewsCount)}
                {translateText(" отзывов)")}
              </small>
            </div>

            <div className="shop-reviews-list">
              {(shop.reviews || []).map((review) => (
                <article className="shop-review-item" key={review.id}>
                  <div className="shop-review-avatar">
                    {translateText(review.author).slice(0, 1)}
                  </div>

                  <div className="shop-review-content">
                    <div className="shop-review-heading">
                      <strong>{translateText(review.author)}</strong>
                      <span
                        className="shop-stars"
                        aria-label={translateText(`${review.rating} из 5`)}
                      >
                        {translateText(
                          "★".repeat(
                            Math.max(
                              0,
                              Math.min(5, Math.round(review.rating || 0)),
                            ),
                          ),
                        )}
                      </span>
                    </div>

                    <small>{translateText(review.date)}</small>
                    <p>{translateText(review.text)}</p>

                    {review.reply && (
                      <div className="shop-owner-reply">
                        <div className="shop-owner-avatar">
                          {translateText(shop.initials)}
                        </div>
                        <div>
                          <strong>
                            {translateText("Ответ от ")}
                            {translateText(shop.name)}
                          </strong>
                          <p>{translateText(review.reply)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="shop-page-aside">
          <section className="shop-card shop-sidebar-card" id="shop-contacts">
            <h2>
              <Phone size={20} />
              {translateText("Контакты")}
            </h2>

            <div className="shop-contact-list">
              {availableContacts.map((contact) => {
                const Icon = contact.icon;

                const content = (
                  <>
                    <span className="shop-contact-icon">
                      <Icon size={19} />
                    </span>
                    <span className="shop-contact-info">
                      <strong>{translateText(contact.title)}</strong>
                      <small>{translateText(contact.subtitle)}</small>
                    </span>
                    <span className="shop-contact-arrow">›</span>
                  </>
                );

                return contact.href ? (
                  <a
                    href={contact.href}
                    key={contact.title}
                    target="_blank"
                    rel="noreferrer"
                    className="shop-contact-item"
                  >
                    {translateText(content)}
                  </a>
                ) : (
                  <button
                    key={contact.title}
                    type="button"
                    className="shop-contact-item"
                    onClick={openChat}
                  >
                    {translateText(content)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="shop-card shop-sidebar-card">
            <h2>
              <MapPin size={20} />
              {translateText("Где нас найти")}
            </h2>

            <div className="shop-map">
              <iframe
                title={translateText(`Карта ${shop.name}`)}
                src={mapLinks.embed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <a
              href={mapLinks.route}
              target="_blank"
              rel="noreferrer"
              className="shop-route-button"
            >
              <Send size={16} />
              {translateText("Построить маршрут")}
            </a>

            <div className="shop-hours">
              <Clock size={21} />
              <div>
                <strong>{translateText(shop.hours)}</strong>
                <small>{translateText("График работы магазина")}</small>
              </div>
            </div>
          </section>

          <section className="shop-card shop-sidebar-card">
            <h2>
              <Package size={20} />
              {translateText("Условия заказа")}
            </h2>

            <div className="shop-condition">
              <Truck size={20} />
              <span>{translateText("Доставка — уточните у продавца")}</span>
            </div>

            <div className="shop-condition">
              <CalendarDays size={20} />
              <span>
                {translateText("Срок приготовления — по договорённости")}
              </span>
            </div>

            <div className="shop-condition">
              <Wallet size={20} />
              <span>
                {translateText("Способ оплаты — уточните при заказе")}
              </span>
            </div>
          </section>
        </aside>
      </div>

      {reviewOpen && (
        <div
          className="shop-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setReviewOpen(false);
            }
          }}
        >
          <form
            className="shop-review-modal"
            role="dialog"
            aria-modal="true"
            aria-label={translateText("Черновик отзыва")}
            onSubmit={submitReview}
          >
            <button
              type="button"
              className="shop-modal-close"
              aria-label={translateText("Закрыть отзыв")}
              onClick={() => setReviewOpen(false)}
            >
              <X size={20} />
            </button>

            <h2>{translateText("Черновик отзыва")}</h2>
            <p>
              {translateText("Поделитесь впечатлением о магазине ")}
              {translateText(shop.name)}
            </p>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={translateText("Ваш отзыв...")}
              aria-label={translateText("Текст отзыва")}
              maxLength={2000}
              autoFocus
              required
            />

            <button type="submit" className="shop-route-button">
              {translateText("Сохранить черновик")}
            </button>
          </form>
        </div>
      )}

      {notice && (
        <div className="shop-toast" role="status">
          {translateText(notice)}
          <button type="button" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}

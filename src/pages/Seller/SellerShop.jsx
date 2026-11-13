
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

import { products, getShop, getMapLinks } from "./sellerData";
import { ProductCard, ShopLogo } from "./SellerParts";
import { useCartStore } from "../../store/cartStore";

export default function SellerShop({ shopId }) {
  const shop = getShop(shopId);

  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);

  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");

  useEffect(() => {
    try {
      setSubscribed(
        localStorage.getItem(`bakeu-sub-${shopId}`) === "true"
      );
    } catch {
      setSubscribed(false);
    }
  }, [shopId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `bakeu-sub-${shopId}`,
        String(subscribed)
      );
    } catch {
      // Storage unavailable
    }
  }, [subscribed, shopId]);

  if (!shop) {
    return (
      <main className="seller-page">
        <div className="seller-empty">
          <Store size={32} />
          <h2>Магазин не найден</h2>
          <Link to="?tab=sellers">Все продавцы</Link>
        </div>
      </main>
    );
  }

  const shopProducts = products.filter(
    (p) => p.shopId === shop.id
  );

  const categories = [
    "Все",
    ...new Set(shopProducts.map((p) => p.category)),
  ];

  const visibleProducts = shopProducts.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "Все" || p.category === category;

    return matchesSearch && matchesCategory;
  });

  const mapLinks = getMapLinks(shop);

  const toggleSubscribe = () => {
    setSubscribed((prev) => !prev);
    setNotice(
      subscribed
        ? "Вы отписались от магазина"
        : "Вы подписались на магазин!"
    );
  };

  const sendMessage = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: message.trim(),
        time: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setMessage("");
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
    } catch {
      // Sharing cancelled
    }
  };

  const submitReview = (e) => {
    e.preventDefault();

    if (!reviewText.trim()) return;

    setNotice(
      "Спасибо! Отзыв принят. Для публикации подключите сервер."
    );

    setReviewText("");
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
      href: `tel:${shop.phone.replace(/\s/g, "")}`,
    },
  ];

  const tabItems = [
    { id: "products", title: "Товары", icon: ShoppingBag },
    { id: "about", title: "О магазине", icon: Info },
    { id: "reviews", title: "Отзывы", icon: Star },
    { id: "contacts", title: "Контакты", icon: MapPin },
  ];

  return (
    <main className="seller-page seller-shop-page">

      <div className="shop-breadcrumb">
        <Link to="/">⌂ Главная</Link>
        <span>/</span>
        <Link to="?tab=sellers">Кондитеры</Link>
        <span>/</span>
        <strong>{shop.name}</strong>
      </div>

      <section className="shop-profile-hero">
        <div
          className="shop-profile-cover"
          style={{ "--shop-color": shop.color }}
        >
          <div className="shop-cover-overlay" />
        </div>

        <div className="shop-profile-body">
          <ShopLogo shop={shop} />

          <div className="shop-profile-info">
            <div className="shop-profile-name">
              <h1>{shop.name}</h1>
              <CheckCircle2
                size={21}
                fill="#dc8b27"
                color="#dc8b27"
              />
            </div>

            <span className="shop-username">
              @{shop.telegram}
            </span>

            <div className="shop-profile-meta">
              <span className="shop-meta-rating">
                <Star size={17} fill="currentColor" />
                <strong>{shop.rating}</strong>
                <span>({shop.reviewsCount} отзывов)</span>
              </span>

              <span className="shop-meta-divider">|</span>

              <span className="shop-open-status">
                <i />
                {shop.hours}
              </span>

              <span>
                <MapPin size={16} />
                {shop.address}
              </span>
            </div>
          </div>

          <div className="shop-profile-actions">
            <button
              className="shop-profile-chat"
              type="button"
              onClick={() => setChatOpen(true)}
            >
              <MessageCircle size={17} />
              Написать в чат
            </button>

            <button
              className={`shop-subscribe ${subscribed ? "is-subscribed" : ""}`}
              type="button"
              onClick={toggleSubscribe}
            >
              {subscribed ? (
                <>
                  <CheckCircle2 size={17} />
                  Вы подписаны
                </>
              ) : (
                "Подписаться"
              )}
            </button>

            <button
              className="shop-share"
              type="button"
              onClick={shareShop}
              aria-label="Поделиться магазином"
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
                  onClick={() => {
                    setActiveTab(tab.id);
                    document
                      .getElementById(`shop-${tab.id}`)
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                  }}
                >
                  <Icon size={18} />
                  {tab.title}
                </button>
              );
            })}
          </nav>

          <section
            className="shop-card shop-showcase"
            id="shop-products"
          >
            <div className="shop-section-title">
              <h2>
                <Store size={20} />
                Витрина магазина
              </h2>
              <span>{shopProducts.length} товаров</span>
            </div>

            <div className="shop-product-tools">
              <label className="shop-product-search">
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Поиск по товарам магазина..."
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
                    {item}
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
                <strong>Товары не найдены</strong>
                <span>
                  Попробуйте изменить поиск или категорию.
                </span>
              </div>
            )}
          </section>

          <section
            className="shop-card shop-about-card"
            id="shop-about"
          >
            <div className="shop-section-title">
              <h2>
                <Info size={21} />
                О магазине
              </h2>
              <span className="shop-decoration">♡</span>
            </div>

            <p>{shop.about}</p>
            <p>{shop.description}</p>
          </section>

          <section
            className="shop-card shop-reviews-card"
            id="shop-reviews"
          >
            <div className="shop-reviews-heading">
              <h2>
                <Star size={22} />
                Отзывы покупателей
              </h2>

              <button
                type="button"
                onClick={() => setReviewOpen(true)}
              >
                <Pencil size={15} />
                Написать отзыв
              </button>
            </div>

            <div className="shop-reviews-summary">
              <strong>{shop.rating}</strong>
              <span className="shop-big-stars">★★★★★</span>
              <small>({shop.reviewsCount} отзывов)</small>
            </div>

            <div className="shop-reviews-list">
              {shop.reviews.map((review) => (
                <article
                  className="shop-review-item"
                  key={review.id}
                >
                  <div className="shop-review-avatar">
                    {review.author.slice(0, 1)}
                  </div>

                  <div className="shop-review-content">
                    <div className="shop-review-heading">
                      <strong>{review.author}</strong>
                      <span className="shop-stars">★★★★★</span>
                    </div>

                    <small>{review.date}</small>
                    <p>{review.text}</p>

                    <div className="shop-owner-reply">
                      <div className="shop-owner-avatar">
                        {shop.initials}
                      </div>
                      <div>
                        <strong>Ответ от {shop.name}</strong>
                        <p>
                          Спасибо за доверие! Будем рады приготовить
                          для вас снова! 🧡
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="shop-page-aside">

          <section
            className="shop-card shop-sidebar-card"
            id="shop-contacts"
          >
            <h2>
              <Phone size={20} />
              Контакты
            </h2>

            <div className="shop-contact-list">
              {contactItems.map((contact) => {
                const Icon = contact.icon;

                const content = (
                  <>
                    <span className="shop-contact-icon">
                      <Icon size={19} />
                    </span>
                    <span className="shop-contact-info">
                      <strong>{contact.title}</strong>
                      <small>{contact.subtitle}</small>
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
                    {content}
                  </a>
                ) : (
                  <button
                    key={contact.title}
                    type="button"
                    className="shop-contact-item"
                    onClick={() => setChatOpen(true)}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="shop-card shop-sidebar-card">
            <h2>
              <MapPin size={20} />
              Где нас найти
            </h2>

            <div className="shop-map">
              <iframe
                title={`Карта ${shop.name}`}
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
              Построить маршрут
            </a>

            <div className="shop-hours">
              <Clock size={21} />
              <div>
                <strong>{shop.hours}</strong>
                <small>График работы магазина</small>
              </div>
            </div>
          </section>

          <section className="shop-card shop-sidebar-card">
            <h2>
              <Package size={20} />
              Условия заказа
            </h2>

            <div className="shop-condition">
              <Truck size={20} />
              <span>Самовывоз и доставка</span>
            </div>

            <div className="shop-condition">
              <CalendarDays size={20} />
              <span>На заказ за 24 часа</span>
            </div>

            <div className="shop-condition">
              <Wallet size={20} />
              <span>Оплата при получении</span>
            </div>
          </section>
        </aside>
      </div>

      {chatOpen && (
        <div className="shop-chat-window">
          <div className="shop-chat-header">
            <ShopLogo shop={shop} />
            <div>
              <strong>Чат с {shop.name}</strong>
              <span><i /> Онлайн</span>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Закрыть чат"
            >
              <X size={19} />
            </button>
          </div>

          <div className="shop-chat-messages">
            <div className="shop-chat-message shop-chat-received">
              Здравствуйте! Чем можем помочь?
              <small>14:32</small>
            </div>

            {messages.map((item) => (
              <div
                key={item.id}
                className="shop-chat-message shop-chat-sent"
              >
                {item.text}
                <small>{item.time}</small>
              </div>
            ))}
          </div>

          <form className="shop-chat-form" onSubmit={sendMessage}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Написать сообщение..."
            />
            <button type="submit" aria-label="Отправить">
              <Send size={19} />
            </button>
          </form>
        </div>
      )}

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
            onSubmit={submitReview}
          >
            <button
              type="button"
              className="shop-modal-close"
              onClick={() => setReviewOpen(false)}
            >
              <X size={20} />
            </button>

            <h2>Оставить отзыв</h2>
            <p>Поделитесь впечатлением о магазине {shop.name}</p>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Ваш отзыв..."
              required
            />

            <button type="submit" className="shop-route-button">
              Отправить отзыв..
            </button>
          </form>
        </div>
      )}

      {notice && (
        <div className="shop-toast" role="status">
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}

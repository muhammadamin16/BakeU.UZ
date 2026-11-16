import { translateText } from "../../i18n/index.js";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Heart,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";

import "./Footer.css";

/**
 * TODO: замените на реальные ссылки вашего приложения,
 * когда оно будет опубликовано в магазинах.
 */
const APP_LINKS = {
  appStore: "https://apps.apple.com/",
  googlePlay: "https://play.google.com/store/apps",
};

const NAV_GROUPS = [
  {
    title: "Покупателям",
    links: [
      { to: "/map", label: "Найти рядом", Icon: MapPin },
      { to: "/ai", label: "Помощник", Icon: Sparkles },
      { to: "/favorites", label: "Избранное", Icon: Heart },
      { to: "/cart", label: "Корзина", Icon: ShoppingBag },
    ],
  },
  {
    title: "Аккаунт",
    links: [
      { to: "/profile", label: "Профиль", Icon: UserRound },
      { to: "/messages", label: "Сообщения", Icon: MessageCircle },
      { to: "/seller", label: "Мастерам", Icon: Store },
    ],
  },
];

function scrollToTop() {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  window.scrollTo({
    top: 0,
    behavior: reducedMotion ? "auto" : "smooth",
  });
}

/* ---------- Логотипы магазинов ---------- */

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="#00B7FF"
        d="M3.6 1.9 13.4 12 3.6 22.1c-.3-.2-.5-.6-.5-1.1V3c0-.5.2-.9.5-1.1Z"
      />
      <path fill="#00F076" d="M3.6 1.9 16.8 9l-3.4 3L3.6 1.9Z" />
      <path fill="#FF3A44" d="M3.6 22.1 16.8 15l-3.4-3-9.8 10.1Z" />
      <path
        fill="#FFD500"
        d="m16.8 9 3.8 2.1c.5.3.5 1.5 0 1.8L16.8 15l-3.4-3 3.4-3Z"
      />
    </svg>
  );
}

function StoreBadge({ href, Icon, caption, name }) {
  return (
    <a
      className="bake-footer__store"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={translateText(`${caption} ${name}`)}
    >
      <Icon />
      <span className="bake-footer__store-text">
        <small>{translateText(caption)}</small>
        <strong>{translateText(name)}</strong>
      </span>
    </a>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bake-footer container">
      <div className="bake-footer__inner">
        <div className="bake-footer__top">
          {/* Бренд */}
          <div className="bake-footer__brand">
            <Link
              to="/"
              className="bake-footer__logo"
              aria-label={translateText("BakeU — на главную")}
            >
              <img
                src="/images/logo-bear.png"
                alt="BakeU"
                width="120"
                height="45"
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p>
              {translateText(
                "Домашние вкусности, которые становятся любимыми.",
              )}
            </p>
          </div>

          {/* Навигация */}
          {NAV_GROUPS.map(({ title, links }) => (
            <nav
              key={title}
              className="bake-footer__group"
              aria-label={translateText(title)}
            >
              <h3>{translateText(title)}</h3>
              <ul>
                {links.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <Link to={to}>
                      <Icon size={14} aria-hidden="true" />
                      {translateText(label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Приложение */}
          <div className="bake-footer__app">
            <h3>{translateText("Скачайте BakeU")}</h3>
            <p>
              {translateText("Заказывайте ещё удобнее — прямо с телефона.")}
            </p>

            <div className="bake-footer__stores">
              <StoreBadge
                href={APP_LINKS.appStore}
                Icon={AppleIcon}
                caption="Загрузите в"
                name="App Store"
              />
              <StoreBadge
                href={APP_LINKS.googlePlay}
                Icon={GooglePlayIcon}
                caption="Доступно в"
                name="Google Play"
              />
            </div>
          </div>
        </div>

        <div className="bake-footer__bottom">
          <p>
            © {translateText(year)}
            {translateText(" BakeU. Все права защищены.")}
          </p>

          <button
            type="button"
            className="bake-footer__up"
            onClick={scrollToTop}
            aria-label={translateText("Прокрутить страницу наверх")}
          >
            {translateText("Наверх")}
            <ArrowUp size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}

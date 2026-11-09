import { Link } from "react-router-dom";
import {
  ArrowUp,
  ArrowUpRight,
  MapPin,
  Heart,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import "./Footer.css";

export default function Footer() {
  function scrollToTop() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <footer className="bake-footer container">
      <div className="bake-footer__inner">
        <div className="bake-footer__top">
          <div className="bake-footer__brand">
            <Link to="/" className="bake-footer__logo">
              Bake<span>U</span>
            </Link>

            <p>
              Домашние вкусности,
              <br />
              которые становятся любимыми.
            </p>

            <span className="bake-footer__signature">
              С любовью к вкусному ♡
            </span>
          </div>

          <nav
            className="bake-footer__column"
            aria-label="Навигация по BakeU"
          >
            <h3>Открывайте BakeU</h3>

            <Link to="/">Главная</Link>
            <Link to="/map">Найти рядом</Link>
            <Link to="/favorites">Любимые товары</Link>
          </nav>

          <nav
            className="bake-footer__column"
            aria-label="Разделы покупателя"
          >
            <h3>Для вас</h3>

            <Link to="/profile">
              <UserRound size={15} aria-hidden="true" />
              Личный кабинет
            </Link>

            <Link to="/cart">
              <ShoppingBag size={15} aria-hidden="true" />
              Корзина
            </Link>

            <Link to="/favorites">
              <Heart size={15} aria-hidden="true" />
              Избранное
            </Link>
          </nav>

          <div className="bake-footer__discover">
            <span className="bake-footer__icon">
              <MapPin size={21} aria-hidden="true" />
            </span>

            <h3>Ваше вкусное — рядом</h3>

            <p>
              Откройте карту и познакомьтесь
              с местными мастерами.
            </p>

            <Link to="/map" className="bake-footer__map-link">
              Посмотреть карту
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="bake-footer__bottom">
          <p>© {new Date().getFullYear()} BakeU</p>

          <span className="bake-footer__made">
            Объединяем тех, кто готовит, и тех, кто любит вкусное.
          </span>

          <button
            type="button"
            className="bake-footer__up"
            onClick={scrollToTop}
            aria-label="Прокрутить страницу наверх"
          >
            Наверх
            <ArrowUp size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
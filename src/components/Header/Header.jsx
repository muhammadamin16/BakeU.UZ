import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";

import { useLanguage } from "../../i18n/useLanguage";
import { setLanguage, translateText } from "../../i18n/index.js";
import { useCartStore } from "../../store/cartStore";
import { useFavoriteStore } from "../../store/favoriteStore";
import "./Header.css";

const LANGUAGES = [
  { code: "uz", label: "UZ", name: "O‘zbekcha" },
  { code: "ru", label: "RU", name: "Русский" },
];

// Higher distance = the glass effect builds up more gradually.
const MAX_SCROLL = 400;
// Lower value = softer, slower response to scrolling.
const SMOOTHNESS = 0.075;
const clamp01 = (value) => Math.min(1, Math.max(0, value));

function formatCount(value) {
  return value > 99 ? "99+" : String(value);
}

function IconLink({ to, label, count, children }) {
  return (
    <Link to={to} className="bakeu-header__icon" aria-label={label}>
      {children}
      {count > 0 && (
        <span className="bakeu-header__count" aria-hidden="true">
          {formatCount(count)}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const language = useLanguage();
  const headerRef = useRef(null);

  const favoriteCount = useFavoriteStore(
    (state) => Object.keys(state.items ?? {}).length
  );
  const cartItems = useCartStore((state) => state.items);
  const cartCount = useMemo(
    () =>
      Object.values(cartItems ?? {}).reduce(
        (sum, quantity) => sum + (Number(quantity) || 0),
        0
      ),
    [cartItems]
  );

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readTarget = () => clamp01(window.scrollY / MAX_SCROLL);
    let current = readTarget();
    let target = current;
    let frameId = null;
    let previousTime = null;

    const paint = (progress) => {
      header.style.setProperty("--hd-opacity", (0.04 + progress * 0.12).toFixed(4));
      header.style.setProperty("--hd-blur", `${(3 + progress * 7).toFixed(2)}px`);
      header.style.setProperty("--hd-shadow", (0.01 + progress * 0.035).toFixed(4));
      header.style.setProperty("--hd-border", (0.06 + progress * 0.12).toFixed(4));
      header.style.setProperty("--hd-progress", progress.toFixed(4));
    };

    const tick = (timestamp) => {
      const delta = previousTime === null ? 16.67 : Math.min(timestamp - previousTime, 64);
      previousTime = timestamp;
      const blend = 1 - Math.pow(1 - SMOOTHNESS, delta / 16.67);
      current += (target - current) * blend;

      if (Math.abs(target - current) < 0.001) {
        current = target;
        paint(current);
        frameId = null;
        previousTime = null;
        return;
      }

      paint(current);
      frameId = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readTarget();
      if (motionQuery.matches) {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        frameId = null;
        previousTime = null;
        current = target;
        paint(current);
        return;
      }
      if (frameId === null) {
        previousTime = null;
        frameId = window.requestAnimationFrame(tick);
      }
    };

    paint(current);
    window.addEventListener("scroll", onScroll, { passive: true });
    motionQuery.addEventListener("change", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      motionQuery.removeEventListener("change", onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <header ref={headerRef} className="bakeu-header-shell">
      <div className="bakeu-header container">
        <Link
          to="/"
          className="bakeu-header__brand"
          aria-label={translateText("BakeU — главная")}
        >
          <img
            src="/images/logo-bear.png"
            alt="BakeU"
            className="bakeu-header__logo"
            width="120"
            height="50"
            decoding="async"
          />
        </Link>

        <div className="bakeu-header__actions">
          <div
            className={`bakeu-header__languages is-${language}`}
            role="group"
            aria-label={translateText("Выбор языка")}
          >
            <span className="bakeu-header__slider" aria-hidden="true" />
            {LANGUAGES.map(({ code, label, name }) => (
              <button
                key={code}
                type="button"
                lang={code}
                title={name}
                aria-label={name}
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
              >
                {label}
              </button>
            ))}
          </div>

          <IconLink
            to="/favorites"
            label={translateText(`Избранное: ${favoriteCount}`)}
            count={favoriteCount}
          >
            <Heart size={20} strokeWidth={1.9} aria-hidden="true" />
          </IconLink>
          <IconLink
            to="/cart"
            label={translateText(`Корзина, товаров: ${cartCount}`)}
            count={cartCount}
          >
            <ShoppingBag size={20} strokeWidth={1.9} aria-hidden="true" />
          </IconLink>
        </div>
      </div>
    </header>
  );
}

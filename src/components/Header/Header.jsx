import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";

import { useCartStore } from "../../store/cartStore";
import { useFavoriteStore } from "../../store/favoriteStore";
import "./Header.css";

const LANGUAGES = [
  { code: "uz", label: "UZ", name: "O‘zbekcha" },
  { code: "ru", label: "RU", name: "Русский" },
];

const STORAGE_KEY = "bakeu:language";
const SCROLL_THRESHOLD = 8;

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((item) => item.code === saved)) return saved;
  } catch {
    /* localStorage недоступен */
  }
  return "ru";
}

function formatCount(value) {
  return value > 99 ? "99+" : String(value);
}

/** Круглая кнопка-ссылка со счётчиком */
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
  const [language, setLanguage] = useState(getInitialLanguage);
  const [scrolled, setScrolled] = useState(false);

  const favoriteCount = useFavoriteStore((s) => Object.keys(s.items ?? {}).length);
  const cartItems = useCartStore((s) => s.items);

  const cartCount = useMemo(
    () => Object.values(cartItems ?? {}).reduce((sum, qty) => sum + qty, 0),
    [cartItems],
  );

  // Стеклянный фон при прокрутке
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Сохранение языка и атрибут lang у <html>
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* localStorage недоступен */
    }
  }, [language]);

  return (
    <header className={`bakeu-header-shell${scrolled ? " is-scrolled" : ""}`}>
      <div className="bakeu-header container">
        <Link to="/" className="bakeu-header__brand" aria-label="BakeU — главная">
          <img
            src="/images/logo-bear.png"
            alt="BakeU"
            className="bakeu-header__logo"
            width="120"
            height="45"
            decoding="async"
          />
        </Link>

        <div className="bakeu-header__actions">
          <div
            className={`bakeu-header__languages is-${language}`}
            role="group"
            aria-label="Выбор языка"
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
            label={`Избранное: ${favoriteCount}`}
            count={favoriteCount}
          >
            <Heart size={20} strokeWidth={1.9} aria-hidden="true" />
          </IconLink>

          <IconLink
            to="/cart"
            label={`Корзина, товаров: ${cartCount}`}
            count={cartCount}
          >
            <ShoppingBag size={20} strokeWidth={1.9} aria-hidden="true" />
          </IconLink>
        </div>
      </div>
    </header>
  );
}
import { useLanguage } from "../../i18n/useLanguage";
import { setLanguage } from "../../i18n/index";
import { translateText } from "../../i18n/index.js";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";

import { useCartStore } from "../../store/cartStore";
import { isLoggedIn } from "../../store/session";
import { useFavoriteStore } from "../../store/favoriteStore";
import "./Header.css";

const LANGUAGES = [
  { code: "uz", label: "UZ", name: "O‘zbekcha" },
  { code: "ru", label: "RU", name: "Русский" },
];

const SCROLL_THRESHOLD = 8;

function formatCount(value) {
  return value > 99 ? "99+" : String(value);
}

/** Круглая кнопка-ссылка со счётчиком */
function IconLink({ to, label, count, children }) {
  return (
    <Link
      to={to}
      className="bakeu-header__icon"
      aria-label={translateText(label)}
    >
      {children}
      {count > 0 && (
        <span className="bakeu-header__count" aria-hidden="true">
          {translateText(formatCount(count))}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const language = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  const favoriteCount = useFavoriteStore(
    (s) => Object.keys(s.items ?? {}).length,
  );
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

  return (
    <header className={`bakeu-header-shell${scrolled ? " is-scrolled" : ""}`}>
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
            height="45"
            decoding="async"
          />
        </Link>

        <nav
          className="bakeu-header__nav"
          aria-label={translateText("Навигация магазина")}
        >
          <Link to="/seller?tab=products">{translateText("Каталог")}</Link>
          <Link to="/seller?tab=sellers">{translateText("Кондитеры")}</Link>
          <Link to="/map">{translateText("Карта")}</Link>
        </nav>
        <div className="bakeu-header__actions">
          <Link
            className="bakeu-header__login"
            to={isLoggedIn() ? "/profile" : "/login"}
          >
            {translateText(isLoggedIn() ? "Мой профиль" : "Войти")}
          </Link>
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
                title={translateText(name)}
                aria-label={translateText(name)}
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
              >
                {translateText(label)}
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

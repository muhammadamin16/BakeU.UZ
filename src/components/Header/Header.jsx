import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import "./Header.css";

export default function Header() {
  const [language, setLanguage] = useState("ru");
  const items = useCartStore((state) => state.items);

  const count = Object.values(items).reduce(
    (total, quantity) => total + quantity,
    0
  );

  return (
    <header className="bakeu-header container">
      <Link to="/" className="bakeu-header__brand">

        <img
          src="/images/logo.png"
          alt="BakeU"
          className="bakeu-header__logo-image"
        />
      </Link>

      <div className="bakeu-header__actions">
        <div
          className={`bakeu-header__languages is-${language}`}
          role="group"
          aria-label="Язык приветствия"
        >
          <span
            className="bakeu-header__language-slider"
            aria-hidden="true"
          />

          {["uz", "ru"].map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={language === lang}
              onClick={() => setLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <Link
          to="/favorites"
          className="bakeu-header__favorites"
          aria-label="Избранное"
        >
          <Heart size={23} strokeWidth={1.8} />
        </Link>

        <Link
          to="/cart"
          className="bakeu-header__cart"
          aria-label={`Корзина: ${count} товаров`}
        >
          <ShoppingBag size={23} strokeWidth={1.8} />

          <span className="bakeu-header__count">
            {count}
          </span>
        </Link>
      </div>
    </header>
  );
}
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Snowflake } from "lucide-react";
import { translateText as t, setLanguage } from "../../i18n/index.js";
import { useLanguage } from "../../i18n/useLanguage.js";

export default function AuthShell({ wide = false, children }) {
  const language = useLanguage();
  return (
    <main className="bk-auth">
      <header className="bk-topbar">
        <Link to="/" className="bk-logo" aria-label={t("BakeU, на главную")}>
          <img
            src="/images/logo-bear.png"
            alt="BakeU"
            width="2172"
            height="724"
          />
        </Link>
        <div className="bk-topbar__right">
          <Link className="bk-home-link" to="/">
            <ArrowLeft size={15} aria-hidden="true" />
            {t("Вернуться в магазин")}
          </Link>
          <div
            className="bk-language"
            role="group"
            aria-label={t("Выбор языка")}
          >
            {[
              { code: "uz", label: "UZ", name: "O‘zbekcha" },
              { code: "ru", label: "RU", name: "Русский" },
            ].map(({ code, label, name }) => (
              <button
                key={code}
                type="button"
                lang={code}
                aria-label={t(name)}
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className={`bk-layout${wide ? " bk-layout--wide" : ""}`}>
        <aside className="bk-story" aria-labelledby="bk-story-title">
          <span className="bk-story__eyebrow">
            <Snowflake size={15} aria-hidden="true" />
            {t("ЗИМА С BAKEU")}
          </span>
          <h2 id="bk-story-title">
            {t("Хорошее начинается")}
            <br />
            <em>{t("с маленьких радостей.")}</em>
          </h2>
          <p>
            {t(
              "Любимые десерты, талантливые мастера и немного тепла — даже в самый снежный день.",
            )}
          </p>
          <div className="bk-story__art" aria-hidden="true">
            <img
              className="bk-story__cake"
              src="/images/products/cake.jpg"
              alt=""
              width="1254"
              height="1254"
            />
            <img
              className="bk-story__snowman"
              src="/images/winter/snowman.png"
              alt=""
              width="1024"
              height="1536"
            />
            <span className="bk-story__star">✧</span>
            <span className="bk-story__sticker">
              <Heart size={18} />
              {t("С любовью")}
            </span>
          </div>
          <span className="bk-story__footer">
            <Snowflake size={16} aria-hidden="true" />
            {t("Сделаем эту зиму чуть теплее")}
          </span>
        </aside>
        <section className={`bk-card${wide ? " bk-card--wide" : ""}`}>
          {children}
        </section>
      </div>
      <footer className="bk-footer">
        <span>© {new Date().getFullYear()} BakeU</span>
        <span>{t("С любовью к вкусному ♡")}</span>
      </footer>
    </main>
  );
}

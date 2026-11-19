import { setLanguage, translateText } from "../../i18n/index.js";
import { useLanguage } from "../../i18n/useLanguage.js";
import "./LanguageSwitcher.css";

const LANGUAGES = [
  { code: "uz", label: "UZ", name: "Özbekça" },
  { code: "ru", label: "RU", name: "Русский" },
];

export default function LanguageSwitcher() {
  const language = useLanguage();

  return (
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
  );
}

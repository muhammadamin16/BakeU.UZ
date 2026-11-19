import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";
import { translateText as t } from "../../i18n/index.js";
import "./TopBanner.css";

const AUTO_DELAY = 6000;
const SWIPE_THRESHOLD = 50;
const SLIDES = [
  {
    title: "Свежая выпечка",
    description: "Торты, хлеб и выпечка от местных пекарей.",
    button: "Смотреть каталог",
    category: "Все",
    image: "/images/banners/winter-bakery.webp",
    mobileImage: "/images/banners/winter-bakery-small.webp",
  },
  {
    title: "Свежий хлеб",
    description: "Домашний хлеб с хрустящей корочкой.",
    button: "Смотреть хлеб",
    category: "Хлеб",
    image: "/images/banners/bread.webp",
  },
  {
    title: "Торты к празднику",
    description: "Торты от местных кондитеров.",
    button: "Смотреть торты",
    category: "Торты",
    image: "/images/banners/cakes.webp",
  },
];

function nextSlide(index, step) {
  return (index + step + SLIDES.length) % SLIDES.length;
}

export default function TopBanner({ onCategoryClick }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchStart = useRef(null);
  const rotating = playing && !hovered && !focused;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setIndex(nextSlide(index, 1)), AUTO_DELAY);
    return () => window.clearTimeout(timer);
  }, [index, rotating]);

  const handleTouchEnd = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const { clientX, clientY } = event.changedTouches[0];
    const deltaX = clientX - start.clientX;
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(clientY - start.clientY)) {
      setIndex((current) => nextSlide(current, deltaX < 0 ? 1 : -1));
    }
  };

  return (
    <section
      className="top-banner"
      aria-label={t("Рекламные предложения")}
      aria-roledescription={t("карусель")}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className="top-banner__track"
        aria-live={rotating ? "off" : "polite"}
        onTouchStart={(event) => {
          const { clientX, clientY } = event.touches[0];
          touchStart.current = { clientX, clientY };
        }}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        {SLIDES.map((slide, position) => (
          <div className="top-banner__slide" key={slide.category} inert={index !== position}>
            <div className="top-banner__content">
              <h1>{t(slide.title)}</h1>
              <p>{t(slide.description)}</p>
              <div className="top-banner__actions">
                <button type="button" className="bu-welcome__browse" onClick={() => onCategoryClick(slide.category)}>
                  {t(slide.button)} <ArrowDown size={17} aria-hidden="true" />
                </button>
                <Link className="bu-map" to="/map">
                  <MapPin size={17} aria-hidden="true" /> {t("Открыть карту")}
                </Link>
              </div>
            </div>
            <picture className="top-banner__picture">
              {slide.mobileImage && <source media="(max-width: 600px)" srcSet={slide.mobileImage} />}
              <img src={slide.image} alt="" fetchPriority={position === 0 ? "high" : "low"} draggable={false} />
            </picture>
          </div>
        ))}
      </div>

      <div className="top-banner__controls">
        <button type="button" aria-label={t("Предыдущий слайд")} onClick={() => setIndex((current) => nextSlide(current, -1))}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="top-banner__pagination">
          {SLIDES.map((slide, position) => (
            <button
              key={slide.category}
              type="button"
              aria-label={`${t("Слайд")} ${position + 1}: ${t(slide.title)}`}
              aria-current={index === position ? "true" : undefined}
              onClick={() => setIndex(position)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" aria-label={t("Следующий слайд")} onClick={() => setIndex((current) => nextSlide(current, 1))}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" aria-label={t(playing ? "Приостановить слайды" : "Запустить слайды")} onClick={() => setPlaying((current) => !current)}>
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}

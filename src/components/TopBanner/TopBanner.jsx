
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { translateText } from "../../i18n/index.js";
import "./TopBanner.css";

const AUTO_DELAY = 5000;
const TRANSITION_DURATION = 800;
const SWIPE_THRESHOLD = 50;

const slides = [
  {
    id: 1,
    title: "Свежий хлеб каждый день",
    description: "Тепло домашней выпечки в каждом кусочке",
    button: "Смотреть хлеб",
    category: "Хлеб",
    image: "/images/banners/bread.webp",
  },
  {
    id: 2,
    title: "Выпечка с любовью",
    description: "Круассаны, булочки и любимые угощения",
    button: "Смотреть выпечку",
    category: "Все",
    image: "/images/banners/bakery.webp",
  },
  {
    id: 3,
    title: "Торты для особенных моментов",
    description: "Нежные десерты для самых тёплых встреч",
    button: "Смотреть торты",
    category: "Торты",
    image: "/images/banners/cakes.webp",
  },
];

// Clone first slide for seamless looping
const carouselSlides = [...slides, slides[0]];

export default function TopBanner({ onCategoryClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [canAutoplay] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [ctaFocused, setCtaFocused] = useState(false);
  const isPlaying = canAutoplay && !ctaFocused;
  const activeIndex = currentIndex % slides.length;

  const currentRef = useRef(0);
  const movingRef = useRef(false);
  const fallbackRef = useRef(null);
  const touchStartRef = useRef(null);
  const raf1Ref = useRef(null);
  const raf2Ref = useRef(null);

  const finishTransition = useCallback(() => {
    window.clearTimeout(fallbackRef.current);

    if (!movingRef.current) return;

    if (currentRef.current === slides.length) {
      // Jump from cloned slide to real first slide
      setTransitionEnabled(false);
      currentRef.current = 0;
      setCurrentIndex(0);

      raf1Ref.current = window.requestAnimationFrame(() => {
        raf2Ref.current = window.requestAnimationFrame(() => {
          raf1Ref.current = null;
          raf2Ref.current = null;
          setTransitionEnabled(true);
          movingRef.current = false;
        });
      });
    } else {
      movingRef.current = false;
    }
  }, []);

  const moveTo = useCallback(
    (nextIndex) => {
      if (nextIndex === currentRef.current) return;

      window.cancelAnimationFrame(raf1Ref.current);
      window.cancelAnimationFrame(raf2Ref.current);
      raf1Ref.current = null;
      raf2Ref.current = null;
      movingRef.current = true;
      currentRef.current = nextIndex;

      setTransitionEnabled(true);
      setCurrentIndex(nextIndex);

      window.clearTimeout(fallbackRef.current);

      fallbackRef.current = window.setTimeout(
        finishTransition,
        TRANSITION_DURATION + 100
      );
    },
    [finishTransition]
  );

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setTimeout(() => {
      moveTo((currentRef.current % slides.length) + 1);
    }, AUTO_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPlaying, activeIndex, moveTo]);

  const handleTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;

    finishTransition();
  };

  // Mobile touch gestures
  const handleTouchStart = (event) => {
    const { clientX, clientY } = event.touches[0];
    touchStartRef.current = { clientX, clientY };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    if (!start) return;

    const { clientX, clientY } = event.changedTouches[0];
    const distance = start.clientX - clientX;
    const verticalDistance = start.clientY - clientY;

    touchStartRef.current = null;

    if (
      Math.abs(distance) < SWIPE_THRESHOLD ||
      Math.abs(distance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    const index = currentRef.current % slides.length;
    moveTo(distance > 0 ? index + 1 : (index + slides.length - 1) % slides.length);
  };

  const handleCategoryClick = (category) => {
    if (typeof onCategoryClick === "function") {
      onCategoryClick(category);
      return;
    }

    document.getElementById("home-catalog")?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(fallbackRef.current);

      if (raf1Ref.current !== null) {
        window.cancelAnimationFrame(raf1Ref.current);
      }

      if (raf2Ref.current !== null) {
        window.cancelAnimationFrame(raf2Ref.current);
      }
    };
  }, []);

  return (
    <section
      className="top-banner"
      aria-label={translateText("Рекламные предложения")}
      aria-roledescription={translateText("карусель")}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStartRef.current = null; }}
    >
      <div
        className="top-banner__track"
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translate3d(-${currentIndex * 100}%, 0, 0)`,
          transition: transitionEnabled
            ? `transform ${TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : "none",
        }}
      >
        {carouselSlides.map((slide, index) => {
          const isActive = index === currentIndex;

          return (
            <div
              key={`${slide.id}-${index}`}
              className="top-banner__slide"
              aria-hidden={!isActive}
              inert={!isActive}
            >
              <img
                className="top-banner__image"
                src={slide.image}
                alt=""
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                draggable={false}
              />

              <div
                className="top-banner__overlay"
                aria-hidden="true"
              />

              <div className="top-banner__content">
                <h1>{translateText(slide.title)}</h1>

                <p>{translateText(slide.description)}</p>

                <button
                  type="button"
                  className="top-banner__cta"
                  onFocus={() => setCtaFocused(true)}
                  onBlur={() => setCtaFocused(false)}
                  onClick={() =>
                    handleCategoryClick(slide.category)
                  }
                >
                  <span>{translateText(slide.button)}</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="top-banner__progress" aria-hidden="true">
        {slides.map((slide, index) => (
          <span key={slide.id} className="top-banner__progress-track">
            {index === activeIndex && (
              <span
                className={isPlaying ? "top-banner__progress-fill is-playing" : "top-banner__progress-fill"}
                style={{ animationDuration: `${AUTO_DELAY}ms` }}
              />
            )}
          </span>
        ))}
      </div>
    </section>
  );
}


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
    image: "/images/banners/cakes.webp",
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
    image: "/images/banners/bread.webp",
  },
];

// Clone first slide for seamless looping
const carouselSlides = [...slides, slides[0]];

export default function TopBanner({ onCategoryClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [progressCycle, setProgressCycle] = useState(0);

  const currentRef = useRef(0);
  const movingRef = useRef(false);
  const timerRef = useRef(null);
  const fallbackRef = useRef(null);
  const touchStartRef = useRef(null);
  const raf1Ref = useRef(null);
  const raf2Ref = useRef(null);

  const activeIndex = currentIndex % slides.length;

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
      if (movingRef.current) return;

      movingRef.current = true;
      currentRef.current = nextIndex;

      setTransitionEnabled(true);
      setCurrentIndex(nextIndex);
      setProgressCycle((value) => value + 1);

      window.clearTimeout(fallbackRef.current);

      fallbackRef.current = window.setTimeout(
        finishTransition,
        TRANSITION_DURATION + 100
      );
    },
    [finishTransition]
  );

  // Automatic slide every 5 seconds
  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      moveTo(currentRef.current + 1);
    }, AUTO_DELAY);

    return () => {
      window.clearTimeout(timerRef.current);
    };
  }, [currentIndex, progressCycle, moveTo]);

  const handleTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;

    finishTransition();
  };

  const goToSlide = (targetIndex) => {
    if (
      movingRef.current ||
      targetIndex === currentRef.current
    ) {
      return;
    }

    moveTo(targetIndex);
  };

  // Mobile touch gestures
  const handleTouchStart = (event) => {
    touchStartRef.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartRef.current === null) return;

    const distance =
      touchStartRef.current - event.changedTouches[0].clientX;

    touchStartRef.current = null;

    if (
      Math.abs(distance) < SWIPE_THRESHOLD ||
      movingRef.current
    ) {
      return;
    }

    if (distance > 0) {
      moveTo(currentRef.current + 1);
    } else {
      moveTo(
        currentRef.current === 0
          ? slides.length - 1
          : currentRef.current - 1
      );
    }
  };

  const handleCategoryClick = (category) => {
    if (typeof onCategoryClick === "function") {
      onCategoryClick(category);
      return;
    }

    document.getElementById("home-catalog")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
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
      aria-roledescription="carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* SLIDER */}
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
                <span className="top-banner__eyebrow">
                  BAKEU · FRESH & HOMEMADE
                </span>

                <h2>{translateText(slide.title)}</h2>

                <p>{translateText(slide.description)}</p>

                <button
                  type="button"
                  className="top-banner__cta"
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

      {/* PROGRESS INDICATORS */}
      <div className="top-banner__pagination">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={`top-banner__indicator ${
              index === activeIndex ? "is-active" : ""
            }`}
            onClick={() => goToSlide(index)}
            aria-label={`${translateText("Слайд")} ${index + 1}`}
            aria-current={
              index === activeIndex ? "true" : undefined
            }
          >
            {index === activeIndex && (
              <span
                key={progressCycle}
                className="top-banner__progress"
                style={{
                  animationDuration: `${AUTO_DELAY}ms`,
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* SLIDE COUNTER */}
      <div className="top-banner__counter" aria-hidden="true">
        <strong>
          {String(activeIndex + 1).padStart(2, "0")}
        </strong>
        <span>/</span>
        <span>
          {String(slides.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}

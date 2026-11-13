import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const slides = [
  {
    image: "cake",
    title: "Для особого повода",
    subtitle: "Торты с характером",
  },
  {
    image: "cookie",
    title: "К любимому чаю",
    subtitle: "Маленькие радости",
  },
  {
    image: "bread",
    title: "Тепло каждого утра",
    subtitle: "Домашний хлеб",
  },
];

export default function HeroSlider() {
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  const gesture = useRef(null);
  const suppressClick = useRef(false);

  function next(step = 1) {
    setActive((index) =>
      (index + step + slides.length) % slides.length
    );
  }

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updateMotion = () => setReduced(media.matches);
    const updateVisibility = () => setHidden(document.hidden);

    updateMotion();
    updateVisibility();

    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener(
        "visibilitychange",
        updateVisibility
      );
    };
  }, []);

  useEffect(() => {
    if (hidden || reduced || focused || touching) return;

    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [active, hidden, reduced, focused, touching]);

  function handleDown(event) {
    if (!event.isPrimary || event.button !== 0) return;

    suppressClick.current = false;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
    };

    setTouching(true);
  }

  function handleMove(event) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!start.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null;
        setTouching(false);
        return;
      }

      if (Math.abs(dx) < 8) return;

      start.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function finish(event, cancelled = false) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;

    gesture.current = null;
    setTouching(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    suppressClick.current = start.dragging || cancelled;

    if (cancelled || !start.dragging) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      next(dx < 0 ? 1 : -1);
    }
  }

  return (
    <section
      className="bu-slider"
      aria-label="Вдохновение для заказа"
      aria-roledescription="карусель"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <div
        className="bu-slider__deck"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={(event) => finish(event)}
        onPointerCancel={(event) => finish(event, true)}
        onLostPointerCapture={(event) => finish(event, true)}
        onPointerLeave={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            finish(event, true);
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        {slides.map((slide, index) => {
          const position =
            (index - active + slides.length) % slides.length;

          return (
            <Link
              key={slide.image}
              to="/seller?tab=products"
              className={`bu-slide bu-slide--${position}`}
              tabIndex={position === 0 ? 0 : -1}
              aria-hidden={position !== 0}
              aria-label={slide.title}
              draggable={false}
              style={{
                pointerEvents: position === 0 ? "auto" : "none",
              }}
            >
              <img
                src={`/images/products/${slide.image}.jpg`}
                alt=""
                draggable={false}
              />

              <span>
                <small>{slide.subtitle}</small>
                <strong>{slide.title}</strong>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
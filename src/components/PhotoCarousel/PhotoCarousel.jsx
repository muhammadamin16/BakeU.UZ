import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { translateText as t } from "../../i18n/index.js";
import "./PhotoCarousel.css";

export default function PhotoCarousel({ product, renderImage, thumbnails = false, children }) {
  const photos = [...new Set([product.image, ...(product.images || [])].filter(Boolean))];
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef(null);
  const swiped = useRef(false);
  const count = photos.length;
  const index = activeIndex < count ? activeIndex : 0;
  const multiple = count > 1;

  function step(direction) {
    setActiveIndex((index + direction + count) % count);
  }

  return (
    <div className="photo-carousel">
      <div
        className="photo-carousel__frame"
        onKeyDown={multiple ? (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          step(event.key === "ArrowLeft" ? -1 : 1);
        } : undefined}
      >
        <div
          className="photo-carousel__image"
          onTouchStart={multiple ? (event) => {
            swiped.current = false;
            touchStart.current = event.touches.length === 1 ? event.touches[0] : null;
          } : undefined}
          onTouchCancel={() => { touchStart.current = null; }}
          onTouchEnd={multiple ? (event) => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start || !event.changedTouches.length) return;
            const end = event.changedTouches[0];
            const dx = end.clientX - start.clientX;
            const dy = end.clientY - start.clientY;
            if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy)) return;
            swiped.current = true;
            step(dx < 0 ? 1 : -1);
          } : undefined}
          onClickCapture={(event) => {
            if (!swiped.current) return;
            swiped.current = false;
            if (event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {renderImage(photos[index])}
        </div>
        {multiple && (
          <>
            <button type="button" className="photo-carousel__arrow is-prev" aria-label={t("Предыдущее изображение")} onClick={() => step(-1)}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" className="photo-carousel__arrow is-next" aria-label={t("Следующее изображение")} onClick={() => step(1)}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <span className="photo-carousel__count" aria-live={thumbnails ? "polite" : undefined}>
              {index + 1} / {count}
            </span>
          </>
        )}
        {children}
      </div>
      {multiple && thumbnails && (
        <div className="photo-carousel__thumbs">
          {photos.map((src, i) => (
            <button key={src} type="button" aria-label={t(`Фото ${i + 1}`)} aria-pressed={i === index} onClick={() => setActiveIndex(i)}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

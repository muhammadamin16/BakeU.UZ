import {
  startTransition,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Store,
  MapPin,
  Sparkles,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import "./MobileNav.css";

const links = [
  { to: "/", label: "Главная", Icon: Store },
  { to: "/map", label: "Карта", Icon: MapPin },
  { to: "/ai", label: "Помощник", Icon: Sparkles },
  { to: "/seller", label: "Кондитер", Icon: ShoppingBag },
  { to: "/profile", label: "Профиль", Icon: UserRound },
];

const PRESS_SCALE = 1.08; // bosilganda indikator kattalashishi
const DRAG_THRESHOLD = 4; // px — shundan keyin "surish" boshlanadi
const CANCEL_MARGIN = 60; // px — navdan shuncha tashqarida qo'yib yuborilsa bekor

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const scrollToTop = () =>
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });

const getActiveIndex = (pathname) =>
  links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`)
  );

/*
  ARXITEKTURA (qotmaslik uchun):
  - Animatsiya JS da emas, brauzerning CSS transition'ida (compositor) ishlaydi.
    Shuning uchun sahifa og'ir bo'lsa ham (masalan, xarita) indikator qotmaydi.
  - Surish paytida faqat bitta `style.transform` yoziladi — React render yo'q,
    layout o'qish yo'q (o'lchamlar oldindan keshlangan).
  - Shisha (blur) qatlami indikatordan alohida, shuning uchun harakat paytida
    blur qayta hisoblanmaydi.
*/

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const linkRefs = useRef([]);
  const metricsRef = useRef({ centers: [], width: 0, originX: 0 });
  const dragRef = useRef(null);
  const activeRef = useRef(-1);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef(0);

  const [previewIndex, setPreviewIndex] = useState(null);

  const activeIndex = getActiveIndex(pathname);
  const selectedIndex = previewIndex ?? activeIndex;

  // Har safar route o'zgarganda sahifani tepaga qaytarish
  useLayoutEffect(() => {
    scrollToTop();
  }, [pathname]);

  /* ---------------- O'lchash ---------------- */

  const measure = useCallback(() => {
    const items = linkRefs.current;
    const first = items[0];

    metricsRef.current = {
      ...metricsRef.current,
      centers: items.map((el) =>
        el ? el.offsetLeft + el.offsetWidth / 2 : 0
      ),
      width: first ? first.offsetWidth : 0,
    };

    const indicator = indicatorRef.current;

    if (indicator && first) {
      indicator.style.width = `${first.offsetWidth}px`;
    }
  }, []);

  /* ---------------- Indikatorni joylash ---------------- */

  // mode: "settle" (prujinali), "drag" (barmoqni kuzatish), "instant" (animatsiyasiz)
  const place = useCallback((x, { scale = 1, mode = "settle" } = {}) => {
    const indicator = indicatorRef.current;
    const { width } = metricsRef.current;

    if (!indicator || !width) return;

    indicator.dataset.mode = mode;
    indicator.style.transform =
      `translate3d(${x - width / 2}px, 0, 0) scale(${scale})`;

    if (mode === "instant") {
      // Transition'siz yozilganini tasdiqlash uchun bir marta flush qilamiz
      void indicator.offsetWidth;
      indicator.dataset.mode = "settle";
    }
  }, []);

  const syncToActive = useCallback(
    (instant = false) => {
      const indicator = indicatorRef.current;
      if (!indicator) return;

      const index = activeRef.current;
      const x = metricsRef.current.centers[index];

      // Nav ichida bo'lmagan sahifa (masalan /login) — indikator yashirin
      if (index < 0 || x === undefined) {
        indicator.dataset.hidden = "true";
        return;
      }

      const wasHidden = indicator.dataset.hidden !== "false";

      indicator.dataset.hidden = "false";

      place(x, { mode: instant || wasHidden ? "instant" : "settle" });
    },
    [place]
  );

  const setPressed = (value) => {
    navRef.current?.toggleAttribute("data-pressed", value);
  };

  /* ---------------- Effektlar ---------------- */

  // Aktiv route o'zgarganda
  useLayoutEffect(() => {
    activeRef.current = activeIndex;

    if (!dragRef.current) {
      measure();
      syncToActive(false);
    }
  }, [activeIndex, measure, syncToActive]);

  // Ekran / shrift o'lchami o'zgarganda
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const update = () => {
      if (dragRef.current) return;

      measure();
      syncToActive(true);
    };

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;

    observer?.observe(nav);

    window.addEventListener("resize", update);

    // Shrift yuklangach o'lcham o'zgarishi mumkin
    document.fonts?.ready?.then(update);

    update();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.clearTimeout(suppressTimerRef.current);
    };
  }, [measure, syncToActive]);

  /* ---------------- Pointer ---------------- */

  const getNearestIndex = (x) => {
    const { centers } = metricsRef.current;

    let nearest = -1;
    let best = Infinity;

    for (let i = 0; i < centers.length; i += 1) {
      const diff = Math.abs(centers[i] - x);

      if (diff < best) {
        best = diff;
        nearest = i;
      }
    }

    return nearest;
  };

  const releaseCapture = (event) => {
    const nav = navRef.current;

    if (nav?.hasPointerCapture?.(event.pointerId)) {
      nav.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerDown = (event) => {
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const nav = navRef.current;

    // Bir marta o'lchaymiz — surish paytida layout o'qilmaydi
    measure();

    const rect = nav.getBoundingClientRect();
    metricsRef.current.originX = rect.left + nav.clientLeft;

    const x = event.clientX - metricsRef.current.originX;
    const index = getNearestIndex(x);

    if (index < 0) return;

    dragRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      index,
      dragging: false,
    };

    nav.setPointerCapture(event.pointerId);

    setPressed(true);
    setPreviewIndex(index);

    const indicator = indicatorRef.current;
    const wasHidden = indicator?.dataset.hidden !== "false";

    if (indicator) indicator.dataset.hidden = "false";

    place(metricsRef.current.centers[index], {
      scale: PRESS_SCALE,
      mode: wasHidden ? "instant" : "settle",
    });
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    if (!drag.dragging) {
      if (Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD) return;

      drag.dragging = true;
    }

    const { centers, originX } = metricsRef.current;

    // Indikator barmoqni uzluksiz kuzatadi (slotlarga sakramaydi)
    const x = clamp(
      event.clientX - originX,
      centers[0],
      centers[centers.length - 1]
    );

    const index = getNearestIndex(x);

    if (index !== drag.index) {
      drag.index = index;
      setPreviewIndex(index);
    }

    place(x, { scale: PRESS_SCALE, mode: "drag" });
  };

  const finishPointer = (event, commit) => {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    dragRef.current = null;

    setPressed(false);
    setPreviewIndex(null);
    releaseCapture(event);

    // Pointerdan keyin keladigan "click"ni bekor qilamiz
    suppressClickRef.current = true;
    window.clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 400);

    const rect = navRef.current?.getBoundingClientRect();

    const outside =
      !rect ||
      event.clientY < rect.top - CANCEL_MARGIN ||
      event.clientY > rect.bottom + CANCEL_MARGIN;

    if (!commit || outside) {
      syncToActive(false);
      return;
    }

    const { index } = drag;

    place(metricsRef.current.centers[index], { scale: 1, mode: "settle" });

    if (activeRef.current === index) {
      scrollToTop();
      return;
    }

    // Og'ir sahifa render bo'lishi animatsiyani to'xtatib qo'ymasligi uchun
    startTransition(() => navigate(links[index].to));
  };

  const handlePointerUp = (event) => finishPointer(event, true);
  const handlePointerCancel = (event) => finishPointer(event, false);

  const handleClickCapture = (event) => {
    // Klaviatura (Enter / Space) — detail === 0, ruxsat beramiz
    if (event.detail === 0) return;

    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <nav
      ref={navRef}
      className="bottom-nav"
      aria-label="Основная навигация"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="bottom-nav__glass" aria-hidden="true" />

      <span
        ref={indicatorRef}
        className="bottom-nav__indicator"
        data-mode="instant"
        data-hidden="true"
        aria-hidden="true"
      />

      {links.map(({ to, label, Icon }, index) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          draggable={false}
          ref={(element) => {
            linkRefs.current[index] = element;
          }}
          className={`bottom-nav__link${
            selectedIndex === index ? " is-active" : ""
          }`}
          onClick={() => {
            if (pathname === to) scrollToTop();
          }}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />

          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

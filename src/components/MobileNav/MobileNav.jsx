
import {
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

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const getActiveIndex = (pathname) =>
  links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`)
  );

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const linkRefs = useRef([]);
  const animationRef = useRef(null);
  const positionRef = useRef(null);
  const dragRef = useRef(null);
  const activeRef = useRef(0);
  const suppressClickRef = useRef(false);

  const [pressed, setPressed] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);

  const activeIndex = getActiveIndex(pathname);
  const selectedIndex = previewIndex ?? activeIndex;

  // Har safar route o'zgarganda sahifani tepaga qaytarish
  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  const getSlots = useCallback(() => {
    return linkRefs.current.map((element) => {
      if (!element) return null;

      return {
        center: element.offsetLeft + element.offsetWidth / 2,
        width: element.offsetWidth,
      };
    });
  }, []);

  const paint = useCallback((x, scale = 1) => {
    const indicator = indicatorRef.current;
    const slots = getSlots();

    if (!indicator || !slots.length || !slots[0]) return;

    const width = slots[0].width;

    indicator.style.width = `${width}px`;
    indicator.style.opacity = "1";
    indicator.style.transform =
      `translate3d(${x - width / 2}px, 0, 0) scale(${scale})`;
  }, [getSlots]);

  const animateTo = useCallback((target, immediate = false) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (positionRef.current === null || immediate) {
      positionRef.current = target;
      paint(target);
      return;
    }

    let lastTime = null;

    const frame = (time) => {
      const dt = lastTime === null
        ? 16
        : clamp(time - lastTime, 1, 32);

      lastTime = time;

      const ease = 1 - Math.exp(-dt / 65);
      const current = positionRef.current;
      const next = current + (target - current) * ease;

      positionRef.current = next;
      paint(next);

      if (Math.abs(target - next) < 0.1) {
        positionRef.current = target;
        paint(target);
        animationRef.current = null;
        return;
      }

      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);
  }, [paint]);

  // Aktiv route indikatorini yangilash
  useLayoutEffect(() => {
    const slots = getSlots();
    const slot = slots[activeIndex];

    activeRef.current = activeIndex;

    if (slot && !dragRef.current) {
      animateTo(
        slot.center,
        positionRef.current === null
      );
    }
  }, [activeIndex, animateTo, getSlots]);

  // Ekran o'lchami o'zgarganda qayta hisoblash
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const update = () => {
      const slots = getSlots();
      const slot = slots[activeRef.current];

      if (slot && !dragRef.current) {
        animateTo(slot.center, true);
      }
    };

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(update)
      : null;

    observer?.observe(nav);

    linkRefs.current.forEach((element) => {
      if (element) observer?.observe(element);
    });

    window.addEventListener("resize", update);
    update();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animateTo, getSlots]);

  const getNearestIndex = (clientX) => {
    const nav = navRef.current;
    const slots = getSlots();

    if (!nav || !slots.length) return -1;

    const rect = nav.getBoundingClientRect();
    const localX = clientX - rect.left;

    let nearest = 0;
    let distance = Infinity;

    slots.forEach((slot, index) => {
      if (!slot) return;

      const difference = Math.abs(slot.center - localX);

      if (difference < distance) {
        distance = difference;
        nearest = index;
      }
    });

    return nearest;
  };

  const handlePointerDown = (event) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const index = getNearestIndex(event.clientX);
    const slots = getSlots();

    if (index < 0 || !slots[index]) return;

    dragRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      index,
      dragging: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    setPressed(true);
    setPreviewIndex(index);
    animateTo(slots[index].center);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.dragging) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
        handlePointerCancel(event);
        return;
      }

      if (Math.abs(dx) < 5) return;

      drag.dragging = true;
    }

    const index = getNearestIndex(event.clientX);
    const slots = getSlots();

    if (index < 0 || !slots[index]) return;

    setPreviewIndex(index);
    animateTo(slots[index].center);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    const index = drag.dragging
      ? getNearestIndex(event.clientX)
      : drag.index;

    const nav = navRef.current;
    const rect = nav?.getBoundingClientRect();

    const outside = !rect ||
      event.clientY < rect.top - 50 ||
      event.clientY > rect.bottom + 50;

    dragRef.current = null;
    setPressed(false);
    setPreviewIndex(null);

    if (nav?.hasPointerCapture(event.pointerId)) {
      nav.releasePointerCapture(event.pointerId);
    }

    suppressClickRef.current = true;

    if (outside || index < 0) {
      const slots = getSlots();
      const slot = slots[activeRef.current];

      if (slot) animateTo(slot.center);
      return;
    }

    const destination = links[index].to;

    if (destination === pathname) {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      navigate(destination);
    }
  };

  const handlePointerCancel = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    dragRef.current = null;

    setPressed(false);
    setPreviewIndex(null);

    const nav = navRef.current;

    if (nav?.hasPointerCapture(event.pointerId)) {
      nav.releasePointerCapture(event.pointerId);
    }

    const slots = getSlots();
    const slot = slots[activeRef.current];

    if (slot) animateTo(slot.center);
  };

  const handleClickCapture = (event) => {
    if (event.detail === 0) {
      return;
    }

    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  return (
    <nav
      ref={navRef}
      className={`bottom-nav${pressed ? " is-pressed" : ""}`}
      aria-label="Основная навигация"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => event.preventDefault()}
    >
      <span
        ref={indicatorRef}
        className="bottom-nav__indicator"
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
            if (pathname === to) {
              window.scrollTo({
                top: 0,
                behavior: "instant",
              });
            }
          }}
          aria-label={label}
        >
          <Icon
            size={22}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <span className="bottom-nav__label">
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

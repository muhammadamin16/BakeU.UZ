import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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

/* Параметры пружин */
const SPRING = {
  // Свободное движение: небольшой "перелёт", как у жидкости
  free: { stiffness: 230, damping: 0.64 },
  // Во время перетаскивания: плотно следует за пальцем
  drag: { stiffness: 900, damping: 0.95 },
  // Эффект нажатия (капсула "набухает")
  press: { stiffness: 320, damping: 0.7 },
};

const PRESS_SCALE = 0.07; // +7% при нажатии
const MAX_STRETCH = 0.16; // максимальное растяжение от скорости

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const bubbleRef = useRef(null);
  const linkRefs = useRef([]);
  const engineRef = useRef(null);
  const activeRef = useRef(-1);

  const [preview, setPreview] = useState(null);

  const activeIndex = links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`)
  );

  useLayoutEffect(() => {
    const nav = navRef.current;
    const bubble = bubbleRef.current;

    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let slots = [];
    let gesture = null;
    let frame = null;
    let lastTime = null;

    // Состояние капсулы: позиция, скорость, растяжение, нажатие
    let current = null;
    let target = null;
    let pressTarget = 0;

    let bubbleWidth = 1;
    let reduced = media.matches;
    let suppressUntil = 0;
    let shownPreview = null;
    let destroyed = false;

    function previewIndex(index) {
      if (shownPreview === index) return;

      shownPreview = index;
      setPreview(index);
    }

    function paint() {
      if (!current) {
        bubble.style.opacity = "0";
        return;
      }

      const pressScale = 1 + PRESS_SCALE * current.press;
      const scaleX = (1 + current.stretch) * pressScale;
      const scaleY = (1 - current.stretch * 0.45) * pressScale;

      bubble.style.opacity = "1";
      bubble.style.transform =
        `translate3d(${current.x - bubbleWidth / 2}px, 0, 0) ` +
        `scale(${scaleX}, ${scaleY})`;
    }

    function stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
    }

    function ensureFrame() {
      if (frame === null && !destroyed) {
        lastTime = null;
        frame = requestAnimationFrame(tick);
      }
    }

    // Один шаг пружинной физики (полунеявный Эйлер)
    function step(h, dragging) {
      const s = dragging ? SPRING.drag : SPRING.free;
      const c = 2 * s.damping * Math.sqrt(s.stiffness);

      const accel =
        s.stiffness * (target - current.x) - c * current.v;

      current.v += accel * h;
      current.x += current.v * h;

      const p = SPRING.press;
      const pc = 2 * p.damping * Math.sqrt(p.stiffness);

      const pAccel =
        p.stiffness * (pressTarget - current.press) -
        pc * current.pv;

      current.pv += pAccel * h;
      current.press += current.pv * h;
    }

    function tick(time) {
      frame = null;

      if (destroyed || !current || target === null) return;

      const dtMs =
        lastTime === null ? 16 : clamp(time - lastTime, 1, 34);

      lastTime = time;

      const dt = dtMs / 1000;
      const dragging = Boolean(gesture?.dragging);

      // Фиксированные подшаги — физика стабильна на любом FPS
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;

      for (let i = 0; i < steps; i++) step(h, dragging);

      // Растяжение зависит от скорости и плавно сглаживается
      const stretchTarget = reduced
        ? 0
        : clamp(
            (Math.abs(current.v) / bubbleWidth) * 0.035,
            0,
            MAX_STRETCH
          );

      current.stretch +=
        (stretchTarget - current.stretch) *
        (1 - Math.exp(-dtMs / 45));

      paint();

      const settled =
        Math.abs(target - current.x) < 0.05 &&
        Math.abs(current.v) < 1 &&
        Math.abs(current.stretch) < 0.001 &&
        Math.abs(pressTarget - current.press) < 0.001 &&
        Math.abs(current.pv) < 0.01;

      if (settled) {
        current = {
          x: target,
          v: 0,
          stretch: 0,
          press: pressTarget,
          pv: 0,
        };
        paint();
        lastTime = null;
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    function moveTo(x, immediate = false) {
      target = x;

      if (!current || immediate || reduced) {
        stop();
        current = {
          x,
          v: 0,
          stretch: 0,
          press: reduced ? 0 : pressTarget,
          pv: 0,
        };
        paint();
        return;
      }

      ensureFrame();
    }

    function setPress(value) {
      pressTarget = reduced ? 0 : value;

      if (current && !reduced) ensureFrame();
    }

    function restore(immediate = false) {
      const slot = slots[activeRef.current];

      if (slot) {
        moveTo(slot.center, immediate);
      } else {
        stop();
        target = null;
        current = null;
        paint();
      }
    }

    function release(id) {
      if (nav.hasPointerCapture(id)) {
        nav.releasePointerCapture(id);
      }
    }

    function cancel() {
      if (!gesture) return;

      const id = gesture.id;
      gesture = null;
      suppressUntil = performance.now() + 700;

      previewIndex(null);
      setPress(0);
      release(id);
      restore();
    }

    function measure() {
      const next = linkRefs.current.map((link) => ({
        center: link.offsetLeft + link.offsetWidth / 2,
        width: link.offsetWidth,
      }));

      const changed =
        next.length !== slots.length ||
        next.some(
          (slot, index) =>
            Math.abs(slot.center - slots[index].center) > 0.1 ||
            Math.abs(slot.width - slots[index].width) > 0.1
        );

      if (!changed) return;

      cancel();
      slots = next;
      bubbleWidth = slots[0]?.width || 1;
      bubble.style.width = `${bubbleWidth}px`;

      restore(true);
    }

    function hitTest(x, y) {
      return linkRefs.current.findIndex((link) => {
        const rect = link.getBoundingClientRect();

        return (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        );
      });
    }

    function nearest(x) {
      let result = 0;
      let distance = Infinity;

      slots.forEach((slot, index) => {
        const nextDistance = Math.abs(slot.center - x);

        if (nextDistance < distance) {
          distance = nextDistance;
          result = index;
        }
      });

      return result;
    }

    function dragPosition(x) {
      const raw = gesture.center + x - gesture.startX;
      const min = slots[0].center;
      const max = slots[slots.length - 1].center;
      const limited = clamp(raw, min, max);
      const overflow = raw - limited;

      // Резиновое сопротивление по краям
      const rubber =
        Math.sign(overflow) *
        14 *
        (1 - Math.exp(-Math.abs(overflow) / 70));

      return {
        x: limited + rubber,
        index: nearest(limited),
      };
    }

    function down(event) {
      if (
        gesture ||
        !event.isPrimary ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      suppressUntil = 0;

      const index = hitTest(event.clientX, event.clientY);
      if (index < 0 || !slots[index]) return;

      gesture = {
        id: event.pointerId,
        index,
        startX: event.clientX,
        startY: event.clientY,
        center: slots[index].center,
        dragging: false,
      };

      nav.setPointerCapture(event.pointerId);

      // Мгновенный отклик: капсула "набухает" и тянется к нажатой кнопке
      previewIndex(index);
      setPress(1);
      moveTo(slots[index].center);
    }

    function move(event) {
      if (!gesture || gesture.id !== event.pointerId) return;

      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;

      if (!gesture.dragging) {
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
          cancel();
          return;
        }

        if (Math.abs(dx) < 4) return;

        gesture.dragging = true;
      }

      const position = dragPosition(event.clientX);

      previewIndex(position.index);
      moveTo(position.x);
    }

    function up(event) {
      if (!gesture || gesture.id !== event.pointerId) return;

      const rect = nav.getBoundingClientRect();

      const outside =
        event.clientY < rect.top - 50 ||
        event.clientY > rect.bottom + 50;

      let index = -1;

      if (!outside) {
        if (gesture.dragging) {
          index = dragPosition(event.clientX).index;
        } else {
          const released = hitTest(event.clientX, event.clientY);
          if (released === gesture.index) index = released;
        }
      }

      const id = gesture.id;
      gesture = null;
      suppressUntil = performance.now() + 700;

      previewIndex(null);
      setPress(0);
      release(id);

      if (index < 0) {
        restore();
        return;
      }

      moveTo(slots[index].center);

      if (index !== activeRef.current) {
        navigate(links[index].to);
      }
    }

    function updateMotion() {
      reduced = media.matches;

      if (reduced) {
        pressTarget = 0;
        if (target !== null) moveTo(target, true);
      }
    }

    function visibilityChange() {
      if (document.hidden) cancel();
    }

    engineRef.current = {
      down,
      move,
      up,

      cancelPointer(event) {
        if (gesture?.id === event.pointerId) cancel();
      },

      routeChanged() {
        cancel();
        previewIndex(null);
        restore();
      },

      click(event) {
        // Клавиатура и открытие в новой вкладке работают обычно
        if (
          event.detail === 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        if (performance.now() < suppressUntil) {
          event.preventDefault();
          event.stopPropagation();
          suppressUntil = 0;
        }
      },

      contextMenu(event) {
        if (gesture) event.preventDefault();
      },
    };

    measure();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);

    observer?.observe(nav);
    linkRefs.current.forEach((link) => observer?.observe(link));

    window.addEventListener("resize", measure);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibilityChange);

    if (media.addEventListener) {
      media.addEventListener("change", updateMotion);
    } else {
      media.addListener(updateMotion);
    }

    return () => {
      destroyed = true;

      const id = gesture?.id;
      gesture = null;

      if (id !== undefined) release(id);

      stop();
      observer?.disconnect();

      window.removeEventListener("resize", measure);
      window.removeEventListener("blur", cancel);
      document.removeEventListener(
        "visibilitychange",
        visibilityChange
      );

      if (media.removeEventListener) {
        media.removeEventListener("change", updateMotion);
      } else {
        media.removeListener(updateMotion);
      }

      engineRef.current = null;
    };
  }, [navigate]);

  useLayoutEffect(() => {
    activeRef.current = activeIndex;
    engineRef.current?.routeChanged();
  }, [pathname, activeIndex, navigate]);

  return (
    <nav
      ref={navRef}
      className={`bottom-nav${preview !== null ? " is-dragging" : ""}`}
      aria-label="Основная навигация"
      onPointerDown={(event) => engineRef.current?.down(event)}
      onPointerMove={(event) => engineRef.current?.move(event)}
      onPointerUp={(event) => engineRef.current?.up(event)}
      onPointerCancel={(event) =>
        engineRef.current?.cancelPointer(event)
      }
      onLostPointerCapture={(event) =>
        engineRef.current?.cancelPointer(event)
      }
      onClickCapture={(event) => engineRef.current?.click(event)}
      onContextMenu={(event) =>
        engineRef.current?.contextMenu(event)
      }
      onDragStart={(event) => event.preventDefault()}
    >
      <span
        ref={bubbleRef}
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
            (preview ?? activeIndex) === index ? " is-active" : ""
          }`}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
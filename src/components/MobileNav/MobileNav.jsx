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

const isActivePath = (pathname, to) =>
  to === "/"
    ? pathname === "/"
    : pathname === to || pathname.startsWith(`${to}/`);

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const bubbleRef = useRef(null);
  const linkRefs = useRef([]);
  const engineRef = useRef(null);

  const activeRef = useRef(-1);
  const pathRef = useRef(pathname);
  const navigateRef = useRef(navigate);

  const [highlight, setHighlight] = useState(null);
  const [pressed, setPressed] = useState(false);

  const activeIndex = links.findIndex(({ to }) =>
    isActivePath(pathname, to)
  );

  useLayoutEffect(() => {
    activeRef.current = activeIndex;
    pathRef.current = pathname;
    navigateRef.current = navigate;

    engineRef.current?.routeChanged();
  }, [pathname, activeIndex, navigate]);

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
    let pendingTimer = null;

    let current = null;
    let target = null;
    let baseWidth = 1;
    let pressTarget = 0;

    let reduced = media.matches;
    let destroyed = false;
    let highlighted = null;
    let suppressUntil = 0;

    function setHighlightIndex(index) {
      if (highlighted === index) return;
      highlighted = index;
      setHighlight(index);
    }

    function clearPending() {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    }

    function paint() {
      if (!current) {
        bubble.style.opacity = "0";
        return;
      }

      bubble.style.opacity = "1";

      const pressScale = 1 + current.press * 0.025;
      const scaleX = (1 + current.stretch) * pressScale;
      const scaleY = (1 - current.stretch * 0.3) * pressScale;

      bubble.style.transform =
        `translate3d(${current.x - baseWidth / 2}px, 0, 0) ` +
        `scale(${scaleX}, ${scaleY})`;
    }

    function stopAnimation() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
    }

    function tick(time) {
      frame = null;

      if (destroyed || !current || target === null) return;

      const dt =
        lastTime === null
          ? 16
          : clamp(time - lastTime, 1, 32);

      lastTime = time;

      const dragging = Boolean(gesture?.dragging);

      const positionEase = reduced
        ? 1
        : 1 - Math.exp(-dt / (dragging ? 24 : 65));

      const shapeEase = reduced
        ? 1
        : 1 - Math.exp(-dt / 75);

      const distance = target - current.x;

      const desiredStretch =
        reduced || !dragging
          ? 0
          : Math.min(
              (Math.abs(distance) / baseWidth) * 0.2,
              0.06
            );

      current.x += distance * positionEase;
      current.stretch +=
        (desiredStretch - current.stretch) * shapeEase;
      current.press +=
        (pressTarget - current.press) * shapeEase;

      paint();

      const settled =
        Math.abs(target - current.x) < 0.05 &&
        Math.abs(current.stretch - desiredStretch) < 0.0005 &&
        Math.abs(current.press - pressTarget) < 0.001;

      if (settled) {
        current.x = target;
        current.stretch = 0;
        current.press = pressTarget;
        paint();
        lastTime = null;
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    function startAnimation() {
      if (
        frame === null &&
        current &&
        target !== null &&
        !destroyed
      ) {
        lastTime = null;
        frame = requestAnimationFrame(tick);
      }
    }

    function moveTo(x, immediate = false) {
      target = x;

      if (!current || immediate || reduced) {
        stopAnimation();

        current = {
          x,
          stretch: 0,
          press: reduced ? 0 : pressTarget,
        };

        paint();
        return;
      }

      startAnimation();
    }

    function setPress(value) {
      pressTarget = reduced ? 0 : value;
      setPressed(Boolean(value));

      if (reduced && current) {
        current.press = 0;
        current.stretch = 0;
        paint();
      } else {
        startAnimation();
      }
    }

    function restore(immediate = false) {
      const slot = slots[activeRef.current];

      if (slot) {
        moveTo(slot.center, immediate);
      } else {
        stopAnimation();
        target = null;
        current = null;
        paint();
      }
    }

    function releaseCapture(id) {
      if (nav.hasPointerCapture(id)) {
        nav.releasePointerCapture(id);
      }
    }

    function cancelGesture() {
      if (!gesture) return;

      const id = gesture.id;
      gesture = null;

      suppressUntil = performance.now() + 700;
      clearPending();
      setHighlightIndex(null);
      setPress(0);
      releaseCapture(id);
      restore();
    }

    function measure() {
      const elements = linkRefs.current;

      if (
        elements.length !== links.length ||
        elements.some((element) => !element)
      ) {
        return;
      }

      const next = elements.map((element) => ({
        center: element.offsetLeft + element.offsetWidth / 2,
        width: element.offsetWidth,
      }));

      const changed =
        slots.length !== next.length ||
        next.some((slot, index) => {
          const previous = slots[index];

          return (
            !previous ||
            Math.abs(slot.center - previous.center) > 0.1 ||
            Math.abs(slot.width - previous.width) > 0.1
          );
        });

      if (!changed) return;

      cancelGesture();
      clearPending();
      setHighlightIndex(null);

      slots = next;
      baseWidth = slots[0].width || 1;
      bubble.style.width = `${baseWidth}px`;

      restore(true);
    }

    function hitTest(x, y) {
      return linkRefs.current.findIndex((element) => {
        if (!element) return false;

        const rect = element.getBoundingClientRect();

        return (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        );
      });
    }

    function nearestIndex(x) {
      let nearest = 0;
      let distance = Infinity;

      slots.forEach((slot, index) => {
        const nextDistance = Math.abs(slot.center - x);

        if (nextDistance < distance) {
          distance = nextDistance;
          nearest = index;
        }
      });

      return nearest;
    }

    function getDragPosition(clientX) {
      const raw =
        gesture.startCenter + clientX - gesture.startX;

      const minimum = slots[0].center;
      const maximum = slots[slots.length - 1].center;
      const limited = clamp(raw, minimum, maximum);
      const overflow = raw - limited;

      const resistance =
        Math.sign(overflow) *
        5 *
        (1 - Math.exp(-Math.abs(overflow) / 60));

      return {
        center: limited + resistance,
        index: nearestIndex(limited),
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

      const index = hitTest(event.clientX, event.clientY);
      const slot = slots[index];

      if (!slot) return;

      clearPending();
      suppressUntil = 0;

      gesture = {
        id: event.pointerId,
        index,
        startX: event.clientX,
        startY: event.clientY,
        startCenter: slot.center,
        dragging: false,
      };

      nav.setPointerCapture(event.pointerId);

      setHighlightIndex(index);
      setPress(1);
      moveTo(slot.center);
    }

    function move(event) {
      if (!gesture || gesture.id !== event.pointerId) return;

      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;

      if (!gesture.dragging) {
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
          cancelGesture();
          return;
        }

        if (Math.abs(dx) < 4) return;

        gesture.dragging = true;
      }

      const position = getDragPosition(event.clientX);

      setHighlightIndex(position.index);
      moveTo(position.center);
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
          // Без прогноза скорости и перескакивания.
          index = getDragPosition(event.clientX).index;
        } else {
          const releasedIndex = hitTest(
            event.clientX,
            event.clientY
          );

          if (releasedIndex === gesture.index) {
            index = releasedIndex;
          }
        }
      }

      const pointerId = gesture.id;

      // Сначала завершаем жест, затем снимаем захват.
      gesture = null;
      suppressUntil = performance.now() + 700;

      setPress(0);
      releaseCapture(pointerId);

      if (index < 0) {
        setHighlightIndex(null);
        restore();
        return;
      }

      setHighlightIndex(index);
      moveTo(slots[index].center);

      const destination = links[index].to;

      if (pathRef.current === destination) {
        setHighlightIndex(null);
        return;
      }

      clearPending();

      pendingTimer = setTimeout(() => {
        pendingTimer = null;

        if (!gesture) {
          setHighlightIndex(null);
          restore();
        }
      }, 1500);

      navigateRef.current(destination);
    }

    function routeChanged() {
      cancelGesture();
      clearPending();
      setHighlightIndex(null);
      setPress(0);
      restore();
    }

    function updateMotion() {
      reduced = media.matches;

      if (reduced) {
        pressTarget = 0;

        if (target !== null) {
          moveTo(target, true);
        }
      }
    }

    function onVisibilityChange() {
      if (document.hidden) cancelGesture();
    }

    engineRef.current = {
      down,
      move,
      up,
      routeChanged,

      cancelPointer(event) {
        if (gesture?.id === event.pointerId) {
          cancelGesture();
        }
      },

      click(event) {
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
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;

    observer?.observe(nav);

    linkRefs.current.forEach((element) => {
      if (element) observer?.observe(element);
    });

    window.addEventListener("resize", measure);
    window.addEventListener("blur", cancelGesture);
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    if (media.addEventListener) {
      media.addEventListener("change", updateMotion);
    } else {
      media.addListener(updateMotion);
    }

    return () => {
      destroyed = true;

      const pointerId = gesture?.id;
      gesture = null;

      if (pointerId !== undefined) {
        releaseCapture(pointerId);
      }

      clearPending();
      stopAnimation();
      observer?.disconnect();

      window.removeEventListener("resize", measure);
      window.removeEventListener("blur", cancelGesture);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );

      if (media.removeEventListener) {
        media.removeEventListener("change", updateMotion);
      } else {
        media.removeListener(updateMotion);
      }

      engineRef.current = null;
    };
  }, []);

  const selectedIndex = highlight ?? activeIndex;

  return (
    <nav
      ref={navRef}
      className={`bottom-nav${pressed ? " is-pressed" : ""}`}
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
            selectedIndex === index ? " is-active" : ""
          }`}
        >
          <Icon
            size={22}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
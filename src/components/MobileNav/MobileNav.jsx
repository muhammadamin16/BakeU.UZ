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

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const linkRefs = useRef([]);
  const slotsRef = useRef([]);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const frameRef = useRef(null);
  const previousTimeRef = useRef(null);
  const currentRef = useRef(null);
  const targetRef = useRef(null);
  const reducedMotionRef = useRef(false);

  const [preview, setPreview] = useState(null);

  const activeIndex = links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`)
  );

  function paint(value) {
    const element = indicatorRef.current;
    if (!element) return;

    element.style.opacity = "1";
    element.style.width = `${value.width}px`;
    element.style.transform =
      `translate3d(${value.center - value.width / 2}px, 0, 0) ` +
      `scaleY(${value.height})`;
  }

  function animate(time) {
    frameRef.current = null;

    const target = targetRef.current;
    const current = currentRef.current;
    if (!target || !current) return;

    const dt = previousTimeRef.current
      ? Math.min(time - previousTimeRef.current, 32)
      : 16;

    previousTimeRef.current = time;

    const dragging = Boolean(gestureRef.current?.dragging);
    const reduce = reducedMotionRef.current;

    // Быстро следует за пальцем, мягко останавливается.
    const positionEase = reduce
      ? 1
      : 1 - Math.exp(-dt / (dragging ? 38 : 65));

    const shapeEase = reduce ? 1 : 1 - Math.exp(-dt / 80);

    const distance = target.center - current.center;

    // Растяжение зависит от отставания, а не от частоты событий.
    const stretch = reduce
      ? 0
      : Math.min(Math.abs(distance) * 0.18, target.width * 0.16);

    const desiredWidth = target.width + stretch;
    const desiredHeight = 1 - (stretch / target.width) * 0.3;

    const next = {
      center: current.center + distance * positionEase,
      width: current.width +
        (desiredWidth - current.width) * shapeEase,
      height: current.height +
        (desiredHeight - current.height) * shapeEase,
    };

    currentRef.current = next;
    paint(next);

    const settled =
      Math.abs(target.center - next.center) < 0.1 &&
      Math.abs(target.width - next.width) < 0.1 &&
      Math.abs(1 - next.height) < 0.001;

    if (settled) {
      const finalValue = { ...target, height: 1 };
      currentRef.current = finalValue;
      paint(finalValue);
      previousTimeRef.current = null;
    } else {
      frameRef.current = requestAnimationFrame(animate);
    }
  }

  function moveTo(slot, immediately = false) {
    if (!slot) return;

    targetRef.current = {
      center: slot.center,
      width: slot.width,
    };

    if (!currentRef.current || immediately) {
      currentRef.current = { ...targetRef.current, height: 1 };
      paint(currentRef.current);
    }

    if (frameRef.current === null) {
      previousTimeRef.current = null;
      frameRef.current = requestAnimationFrame(animate);
    }
  }

  function nearest(center) {
    return slotsRef.current.reduce((best, slot, index, slots) => {
      return Math.abs(slot.center - center) <
        Math.abs(slots[best].center - center)
        ? index
        : best;
    }, 0);
  }

  function restoreActive() {
    const slot = slotsRef.current[activeIndex];

    if (slot) {
      moveTo(slot);
    } else {
      targetRef.current = null;
      currentRef.current = null;
      if (indicatorRef.current) {
        indicatorRef.current.style.opacity = "0";
      }
    }
  }

  useLayoutEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updateMotion = () => {
      reducedMotionRef.current = media.matches;
    };

    updateMotion();
    media.addEventListener("change", updateMotion);

    return () => {
      media.removeEventListener("change", updateMotion);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    gestureRef.current = null;
    setPreview(null);

    function measure() {
      slotsRef.current = linkRefs.current.map((link) => ({
        center: link.offsetLeft + link.offsetWidth / 2,
        width: link.offsetWidth,
      }));

      gestureRef.current = null;
      setPreview(null);
      restoreActive();
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(navRef.current);
    linkRefs.current.forEach((link) => observer.observe(link));

    return () => observer.disconnect();
  }, [pathname]);

  function handlePointerDown(event) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    suppressClickRef.current = false;

    const index = linkRefs.current.findIndex(
      (link) => link?.contains(event.target)
    );

    if (index < 0) return;

    gestureRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      center: slotsRef.current[index].center,
      width: slotsRef.current[index].width,
      dragging: false,
    };
  }

  function dragTarget(clientX, gesture) {
    const slots = slotsRef.current;
    const raw = gesture.center + clientX - gesture.startX;
    const min = slots[0].center;
    const max = slots[slots.length - 1].center;
    const clamped = Math.max(min, Math.min(max, raw));
    const overflow = raw - clamped;

    // Небольшое сопротивление у края.
    const rubber =
      Math.sign(overflow) *
      10 *
      (1 - Math.exp(-Math.abs(overflow) / 65));

    return {
      center: clamped + rubber,
      width: gesture.width,
      index: nearest(clamped),
    };
  }

  function handlePointerMove(event) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (!gesture.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        gestureRef.current = null;
        return;
      }

      if (Math.abs(dx) < 6) return;

      gesture.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const target = dragTarget(event.clientX, gesture);
    setPreview(target.index);
    moveTo(target);
  }

  function finishGesture(event, cancelled = false) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;

    gestureRef.current = null;
    setPreview(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Обычный клик обрабатывается самим NavLink.
    if (!gesture.dragging) return;

    suppressClickRef.current = true;

    if (cancelled) {
      restoreActive();
      return;
    }

    const { index } = dragTarget(event.clientX, gesture);

    moveTo(slotsRef.current[index]);

    if (index !== activeIndex) {
      navigate(links[index].to);
    }
  }

  return (
    <nav
      ref={navRef}
      className={`bottom-nav${preview !== null ? " is-dragging" : ""}`}
      aria-label="Основная навигация"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={(event) => finishGesture(event, true)}
      onLostPointerCapture={(event) => finishGesture(event, true)}
      onPointerLeave={() => {
        if (!gestureRef.current?.dragging) {
          gestureRef.current = null;
        }
      }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (suppressClickRef.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }
      }}
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
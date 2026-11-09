import {
  useEffect,
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

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const linkRefs = useRef([]);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);

  const [positions, setPositions] = useState([]);
  const [drag, setDrag] = useState(null);

  const activeIndex = links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`)
  );

  const activePosition = positions[activeIndex];
  const indicator = drag ?? activePosition;
  const highlightedIndex = drag?.index ?? activeIndex;

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function measure() {
      setPositions(
        linkRefs.current.map((link) => ({
          left: link.offsetLeft,
          width: link.offsetWidth,
        }))
      );
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(nav);

    linkRefs.current.forEach((link) => {
      if (link) observer.observe(link);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    gestureRef.current = null;
    setDrag(null);
  }, [pathname]);

  function nearestIndex(center, slots) {
    let nearest = 0;
    let distance = Infinity;

    slots.forEach((slot, index) => {
      const nextDistance = Math.abs(
        center - (slot.left + slot.width / 2)
      );

      if (nextDistance < distance) {
        distance = nextDistance;
        nearest = index;
      }
    });

    return nearest;
  }

function getDragPosition(clientX, gesture) {
  const dx = clientX - gesture.startX;
  const first = gesture.slots[0];
  const last = gesture.slots[gesture.slots.length - 1];

  const minLeft = first.left;
  const maxLeft = last.left + last.width - gesture.width;
  const rawLeft = gesture.initialLeft + dx;

  const clampedLeft = Math.max(
    minLeft,
    Math.min(maxLeft, rawLeft)
  );

  // Четга етганда енгил резинадек тортилади.
  const overflow = rawLeft - clampedLeft;
  const resistance =
    Math.sign(overflow) *
    18 *
    (1 - Math.exp(-Math.abs(overflow) / 70));

  // Ҳаракат тезлигига қараб чўзилади.
  const now = performance.now();
  const elapsed = Math.max(16, now - (gesture.lastTime ?? now));
  const movement = clientX - (gesture.lastX ?? gesture.startX);
  const speed = Math.min(Math.abs(movement) / elapsed, 2);

  const desiredStretch = speed * 15;
  const stretch =
    (gesture.stretch ?? 0) * 0.6 + desiredStretch * 0.4;

  gesture.lastX = clientX;
  gesture.lastTime = now;
  gesture.stretch = stretch;

  const width = gesture.width + stretch;

  return {
    left: clampedLeft + resistance - stretch / 2,
    width,
    scaleY: 1 - Math.min(stretch / gesture.width, 0.3) * 0.35,
    index: nearestIndex(
      clampedLeft + gesture.width / 2,
      gesture.slots
    ),
  };
}

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

    const pressedIndex = linkRefs.current.findIndex(
      (link) => link?.contains(event.target)
    );

    if (pressedIndex < 0 || !positions.length) return;

    const initial = positions[pressedIndex];

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialLeft: initial.left,
      width: initial.width,
      slots: positions,
      dragging: false,
    };

    // Сохраняем жест, даже если указатель выйдет за navbar.
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (!gesture.dragging) {
      // Вертикальное движение остаётся прокруткой страницы.
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        finishGesture(event, true);
        return;
      }

      if (Math.abs(dx) < 6) return;

      gesture.dragging = true;
    }

    setDrag(getDragPosition(event.clientX, gesture));
  }

  function finishGesture(event, cancelled = false) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const target = getDragPosition(event.clientX, gesture);

    gestureRef.current = null;
    setDrag(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (cancelled || gesture.dragging) {
      suppressClickRef.current = true;
    }

    if (cancelled) return;

    if (gesture.dragging) {
      if (target.index !== activeIndex) {
        navigate(links[target.index].to);
      }
      return;
    }

    // Обычное нажатие: проверяем, где отпустили указатель.
    const index = linkRefs.current.findIndex((link) => {
      const rect = link.getBoundingClientRect();

      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });

    // Pointer capture может перенаправить click на nav,
    // поэтому переход при нажатии выполняем здесь.
    suppressClickRef.current = true;

    if (index >= 0 && index !== activeIndex) {
      navigate(links[index].to);
    }
  }

  return (
    <nav
      ref={navRef}
      className={`bottom-nav${drag ? " is-dragging" : ""}`}
      aria-label="Основная навигация"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishGesture(event)}
      onPointerCancel={(event) => finishGesture(event, true)}
      onLostPointerCapture={() => {
        if (gestureRef.current) {
          suppressClickRef.current = true;
          gestureRef.current = null;
          setDrag(null);
        }
      }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        // Клавиатурные клики продолжают работать.
        if (suppressClickRef.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }
      }}
    >
<span
  className="bottom-nav__indicator"
  aria-hidden="true"
  style={{
    width: indicator?.width ?? 0,
    transform: `
      translate3d(${indicator?.left ?? 0}px, 0, 0)
      scaleY(${drag?.scaleY ?? 1})
    `,
    opacity: indicator ? 1 : 0,
  }}
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
            highlightedIndex === index ? " is-active" : ""
          }`}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
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

  const [previewIndex, setPreviewIndex] = useState(null);
  const [indicator, setIndicator] = useState(null);

  const activeIndex = links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`)
  );

  const shownIndex = previewIndex ?? activeIndex;

  // Обновляем положение индикатора при переходе и изменении размеров.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function updateIndicator() {
      const link = linkRefs.current[shownIndex];

      if (!link) {
        setIndicator(null);
        return;
      }

      setIndicator({
        left: link.offsetLeft,
        width: link.offsetWidth,
      });
    }

    updateIndicator();

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(nav);

    linkRefs.current.forEach((link) => {
      if (link) observer.observe(link);
    });

    return () => observer.disconnect();
  }, [shownIndex]);

  useEffect(() => {
    gestureRef.current = null;
    setPreviewIndex(null);
  }, [pathname]);

  function findIndexAt(clientX, clientY) {
    return linkRefs.current.findIndex((link) => {
      if (!link) return false;

      const rect = link.getBoundingClientRect();

      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    });
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

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
  }

  function handlePointerMove(event) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    // Вертикальный жест оставляем для прокрутки страницы.
    if (!gesture.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        gestureRef.current = null;
        return;
      }

      if (Math.abs(dx) < 8) return;

      gesture.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const index = findIndexAt(event.clientX, event.clientY);
    setPreviewIndex(index >= 0 ? index : null);
  }

  function finishGesture(event, cancelled = false) {
    const gesture = gestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    gestureRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setPreviewIndex(null);

    if (!gesture.dragging) return;

    // Не даём клику после перетаскивания выполнить второй переход.
    suppressClickRef.current = true;

    if (cancelled) return;

    const index = findIndexAt(event.clientX, event.clientY);

    if (index >= 0 && index !== activeIndex) {
      navigate(links[index].to);
    }
  }

  return (
    <nav
      ref={navRef}
      className="bottom-nav"
      aria-label="Основная навигация"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishGesture(event)}
      onPointerCancel={(event) => finishGesture(event, true)}
      onLostPointerCapture={() => {
        gestureRef.current = null;
        setPreviewIndex(null);
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
        className="bottom-nav__indicator"
        aria-hidden="true"
        style={{
          width: indicator?.width ?? 0,
          transform: `translateX(${indicator?.left ?? 0}px)`,
          opacity: indicator ? 1 : 0,
        }}
      />

      {links.map(({ to, label, Icon }, index) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          ref={(element) => {
            linkRefs.current[index] = element;
          }}
          className={({ isActive }) =>
            `bottom-nav__link${isActive ? " is-active" : ""}`
          }
        >
          <Icon size={22} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
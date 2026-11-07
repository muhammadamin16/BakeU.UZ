import { useEffect, useLayoutEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Store, MapPin, Sparkles, ShoppingBag, UserRound } from "lucide-react";

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

  const linkRefs = useRef([]);
  const indicatorRef = useRef(null);
  const dragging = useRef(false);
  const firstRender = useRef(true);

  const activeIndex = links.findIndex(({ to }) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to)
  );

  const placeIndicator = (animate) => {
    const el = linkRefs.current[activeIndex];
    const ind = indicatorRef.current;
    if (!ind) return;

    if (!el) {
      ind.style.opacity = "0";
      return;
    }

    ind.style.opacity = "1";
    ind.style.width = `${el.offsetWidth}px`;
    ind.style.transform = `translateX(${el.offsetLeft}px)`;

    if (animate && ind.animate) {
      ind.animate(
        [
          { scale: "1 1" },
          { scale: "1.22 0.86", offset: 0.4 },
          { scale: "1 1" },
        ],
        { duration: 560, easing: "ease-in-out" }
      );
    }
  };

  useLayoutEffect(() => {
    const ind = indicatorRef.current;

    if (firstRender.current) {
      firstRender.current = false;
      ind.style.transition = "none";
      placeIndicator(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          ind.style.transition = "";
        })
      );
    } else {
      placeIndicator(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  useEffect(() => {
    const onResize = () => {
      const ind = indicatorRef.current;
      ind.style.transition = "none";
      placeIndicator(false);
      requestAnimationFrame(() => {
        ind.style.transition = "";
      });
    };
    const stopDrag = () => {
      dragging.current = false;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const pick = (e) => {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const link = target?.closest?.(".bottom-nav__link");
    const index = linkRefs.current.indexOf(link);
    if (index !== -1 && index !== activeIndex) navigate(links[index].to);
  };

  return (
    <nav
      className="bottom-nav"
      aria-label="Основная навигация"
      onPointerDown={(e) => {
        dragging.current = true;
        pick(e);
      }}
      onPointerMove={(e) => dragging.current && pick(e)}
    >
      <span className="bottom-nav__indicator" ref={indicatorRef} aria-hidden="true" />

      {links.map(({ to, label, Icon }, i) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          ref={(el) => (linkRefs.current[i] = el)}
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

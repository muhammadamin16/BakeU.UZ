import { translateText } from "../../i18n/index.js";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { Store, MapPin, Sparkles, ShoppingBag, UserRound } from "lucide-react";

import "./MobileNav.css";

const links = [
  { to: "/", label: "Главная", Icon: Store },
  { to: "/seller", label: "Кондитер", Icon: ShoppingBag },
  { to: "/ai", label: "Помощник", Icon: Sparkles },
  { to: "/map", label: "Карта", Icon: MapPin },
  { to: "/profile", label: "Профиль", Icon: UserRound },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getActiveIndex = (pathname) =>
  links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`),
  );

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const linkRefs = useRef([]);
  const rafRef = useRef(null);
  const dragRef = useRef(null);
  const activeRef = useRef(0);
  const suppressClickRef = useRef(false);

  const spring = useRef({
    x: null,
    v: 0,
    target: 0,
    s: 0,
    sv: 0,
    sTarget: 0,
    o: 0,
    ov: 0,
    oTarget: 0,
  });

  const [pressed, setPressed] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);

  const activeIndex = getActiveIndex(pathname);
  const selectedIndex = previewIndex ?? activeIndex;

  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  const getSlots = useCallback(
    () =>
      linkRefs.current.map((element) =>
        element
          ? {
              center: element.offsetLeft + element.offsetWidth / 2,
              width: element.offsetWidth,
            }
          : null,
      ),
    [],
  );

  const paint = useCallback(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    const slots = getSlots();
    const state = spring.current;

    if (!nav || !indicator || !slots[0] || state.x === null) {
      return;
    }

    const slotWidth = slots[0].width;
    const padding = parseFloat(getComputedStyle(nav).paddingTop) || 8;

    const baseHeight = nav.clientHeight - padding * 2;
    const speed = Math.abs(state.v);
    const direction = Math.sign(state.v);

    const stretch = Math.min(speed / 30, slotWidth * 0.14);

    const extraHeight = Math.min(speed / 90, 4);
    const edge = Math.abs(state.o);
    const edgeDirection = Math.sign(state.o);

    const width = slotWidth * (1 + 0.32 * state.s) + stretch + edge;

    const height = baseHeight + extraHeight * 2 - Math.min(edge * 0.08, 3);

    const center =
      state.x + direction * stretch * 0.25 + (edgeDirection * edge) / 2;

    const left = clamp(center - width / 2, -22, nav.clientWidth - width + 22);

    const top = padding - (height - baseHeight) / 2;

    indicator.style.width = `${width}px`;
    indicator.style.height = `${height}px`;
    indicator.style.opacity = "1";

    indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }, [getSlots]);

  const run = useCallback(() => {
    if (rafRef.current !== null || spring.current.x === null) {
      return;
    }

    let last = null;

    const frame = (time) => {
      const state = spring.current;

      const dt =
        last === null ? 0.016 : clamp((time - last) / 1000, 0.001, 0.032);

      last = time;

      const dragging = Boolean(dragRef.current?.dragging);
      const stiffness = dragging ? 380 : 150;
      const damping = dragging ? 24 : 21;

      state.v +=
        (stiffness * (state.target - state.x) - damping * state.v) * dt;

      state.x += state.v * dt;

      state.sv += (260 * (state.sTarget - state.s) - 17 * state.sv) * dt;

      state.s += state.sv * dt;

      state.ov += (300 * (state.oTarget - state.o) - 20 * state.ov) * dt;

      state.o += state.ov * dt;

      paint();

      const settled =
        Math.abs(state.target - state.x) < 0.2 &&
        Math.abs(state.v) < 2 &&
        Math.abs(state.sTarget - state.s) < 0.002 &&
        Math.abs(state.sv) < 0.01 &&
        Math.abs(state.oTarget - state.o) < 0.2 &&
        Math.abs(state.ov) < 2;

      if (settled) {
        state.x = state.target;
        state.v = 0;
        state.s = state.sTarget;
        state.sv = 0;
        state.o = state.oTarget;
        state.ov = 0;

        paint();
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
  }, [paint]);

  const animateTo = useCallback(
    (target, immediate = false) => {
      const state = spring.current;
      state.target = target;

      if (state.x === null || immediate) {
        state.x = target;
        state.v = 0;
        paint();
        return;
      }

      run();
    },
    [paint, run],
  );

  const setPress = useCallback(
    (on) => {
      spring.current.sTarget = on ? 1 : 0;
      run();
    },
    [run],
  );

  useLayoutEffect(() => {
    activeRef.current = activeIndex;

    const slot = getSlots()[activeIndex];

    if (slot && !dragRef.current) {
      animateTo(slot.center, spring.current.x === null);
    }
  }, [activeIndex, animateTo, getSlots]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const update = () => {
      const slot = getSlots()[activeRef.current];

      if (slot && !dragRef.current) {
        animateTo(slot.center, true);
      }
    };

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;

    observer?.observe(nav);

    linkRefs.current.forEach((element) => {
      if (element) observer?.observe(element);
    });

    window.addEventListener("resize", update);
    update();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [animateTo, getSlots]);

  function getNearestIndex(clientX) {
    const nav = navRef.current;
    if (!nav) return -1;

    const localX = clientX - nav.getBoundingClientRect().left;

    let nearest = -1;
    let distance = Infinity;

    getSlots().forEach((slot, index) => {
      if (!slot) return;

      const difference = Math.abs(slot.center - localX);

      if (difference < distance) {
        distance = difference;
        nearest = index;
      }
    });

    return nearest;
  }

  function finishPress(event) {
    dragRef.current = null;
    setPressed(false);
    setPreviewIndex(null);

    spring.current.oTarget = 0;
    setPress(false);

    if (navRef.current?.hasPointerCapture(event.pointerId)) {
      navRef.current.releasePointerCapture(event.pointerId);
    }
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

    const index = getNearestIndex(event.clientX);
    const slot = getSlots()[index];

    if (!slot) return;

    suppressClickRef.current = false;

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
    setPress(true);
    animateTo(slot.center);
  }

  function handlePointerMove(event) {
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

    const slots = getSlots();
    const nav = navRef.current;

    if (!nav || !slots[0]) return;

    const localX = event.clientX - nav.getBoundingClientRect().left;

    const first = slots[0].center;
    const last = slots[slots.length - 1].center;

    animateTo(clamp(localX, first, last));

    let overshoot = 0;

    if (localX > last) overshoot = localX - last;
    else if (localX < first) overshoot = localX - first;

    const maxStretch = slots[0].width * 0.2;

    spring.current.oTarget =
      Math.sign(overshoot) *
      maxStretch *
      (1 - Math.exp(-Math.abs(overshoot) / maxStretch));

    run();

    const index = getNearestIndex(event.clientX);

    if (index >= 0) setPreviewIndex(index);
  }

  function handlePointerUp(event) {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    const index = drag.dragging ? getNearestIndex(event.clientX) : drag.index;

    const rect = navRef.current?.getBoundingClientRect();

    const outside =
      !rect ||
      event.clientY < rect.top - 50 ||
      event.clientY > rect.bottom + 50;

    finishPress(event);
    suppressClickRef.current = true;

    if (outside || index < 0) {
      const slot = getSlots()[activeRef.current];
      if (slot) animateTo(slot.center);
      return;
    }

    const slot = getSlots()[index];
    if (slot) animateTo(slot.center);

    const destination = links[index].to;

    if (destination === pathname) {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      navigate(destination);
    }
  }

  function handlePointerCancel(event) {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    finishPress(event);

    const slot = getSlots()[activeRef.current];
    if (slot) animateTo(slot.center);
  }

  function handleClickCapture(event) {
    if (event.detail === 0) return;

    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  }

  return (
    <div className="bottom-nav-shell bottom-nav-shell--centered">
      <nav
        ref={navRef}
        className={`bottom-nav${pressed ? " is-pressed" : ""}`}
        aria-label={translateText("Основная навигация")}
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
            aria-label={translateText(label)}
            onClick={() => {
              if (pathname === to) {
                window.scrollTo({
                  top: 0,
                  behavior: "instant",
                });
              }
            }}
          >
            <Icon size={22} strokeWidth={1.8} aria-hidden="true" />

            <span className="bottom-nav__label">{translateText(label)}</span>
          </NavLink>
        ))}
      </nav>

      <img
        className="bottom-nav__mascot"
        src="/images/winter/bear-gift.png"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </div>
  );
}

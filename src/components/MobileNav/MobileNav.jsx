import { useCallback, useLayoutEffect, useRef, useState } from "react";
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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getActiveIndex = (pathname) =>
  links.findIndex(({ to }) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`)
  );

// Судраётганда: бармоқни тез кузатади
const DRAG_STIFFNESS = 380;
const DRAG_DAMPING = 24;

// Тугмага ўтишда: юмшоқ ва силлиқ
const SETTLE_STIFFNESS = 150;
const SETTLE_DAMPING = 21;

// Босилгандаги кенгайиш пружинаси
const SIZE_STIFFNESS = 260;
const SIZE_DAMPING = 17;

// Четдаги резинка чўзилиши пружинаси
const EDGE_STIFFNESS = 300;
const EDGE_DAMPING = 20;

// Созлаш учун қийматлар
const PRESS_GROW = 0.32; // босилганда ён томонга кенгайиш
const MOVE_STRETCH_MAX = 0.14; // ҳаракатдаги максимал чўзилиш
const EDGE_STRETCH_MAX = 0.2; // четдаги резинка максимуми
const NAV_OVERFLOW = 22; // индикатор навбардан максимал чиқиши (px)

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

  // x — марказ, v — тезлик
  // s — босилиш кенгайиши, sv — унинг тезлиги
  // o — четдаги чўзилиш (+ ўнгга, − чапга), ov — унинг тезлиги
  const spring = useRef({
    x: null, v: 0, target: 0,
    s: 0, sv: 0, sTarget: 0,
    o: 0, ov: 0, oTarget: 0,
  });

  const [pressed, setPressed] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);

  const activeIndex = getActiveIndex(pathname);
  const selectedIndex = previewIndex ?? activeIndex;

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  const getSlots = useCallback(
    () =>
      linkRefs.current.map((el) =>
        el ? { center: el.offsetLeft + el.offsetWidth / 2, width: el.offsetWidth } : null
      ),
    []
  );

  /* ---------- Чизиш ---------- */
  const paint = useCallback(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    const slots = getSlots();
    const st = spring.current;

    if (!nav || !indicator || !slots[0] || st.x === null) return;

    const slotW = slots[0].width;
    const pad = parseFloat(getComputedStyle(nav).paddingTop) || 8;
    const baseH = nav.clientHeight - pad * 2;

    // 1) Ўртада: ҳаракат йўналишида озгина чўзилиш
    const speed = Math.abs(st.v);
    const dir = Math.sign(st.v);
    const moveStretch = Math.min(speed / 30, slotW * MOVE_STRETCH_MAX);

    // тепа ва пастдан жуда озгина
    const hExtra = Math.min(speed / 90, 4);

    // 2) Четда: резинка каби чўзилиш
    const edge = Math.abs(st.o);
    const edgeDir = Math.sign(st.o);

    const w = slotW * (1 + PRESS_GROW * st.s) + moveStretch + edge;
    const h = baseH + hExtra * 2 - Math.min(edge * 0.08, 3);

    // Олд томони кўпроқ чўзилади
    let centerX = st.x + dir * moveStretch * 0.25;

    // Четга чўзилганда фақат шу томони кетади
    centerX += edgeDir * (edge / 2);

    // Навбар чегарасидан ортиқча чиқмайди
    const left = clamp(
      centerX - w / 2,
      -NAV_OVERFLOW,
      nav.clientWidth - w + NAV_OVERFLOW
    );
    const top = pad - (h - baseH) / 2;

    indicator.style.width = `${w}px`;
    indicator.style.height = `${h}px`;
    indicator.style.opacity = "1";
    indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }, [getSlots]);

  /* ---------- Пружина цикли ---------- */
  const run = useCallback(() => {
    if (rafRef.current !== null) return;

    let last = null;

    const frame = (time) => {
      const st = spring.current;
      const dt = last === null ? 0.016 : clamp((time - last) / 1000, 0.001, 0.032);
      last = time;

      // Ҳаракат: судраётганда қаттиқ, бошқа пайтда юмшоқ пружина
      const dragging = !!dragRef.current?.dragging;
      const k = dragging ? DRAG_STIFFNESS : SETTLE_STIFFNESS;
      const c = dragging ? DRAG_DAMPING : SETTLE_DAMPING;

      st.v += (k * (st.target - st.x) - c * st.v) * dt;
      st.x += st.v * dt;

      // Босилганда кенгайиш
      st.sv += (SIZE_STIFFNESS * (st.sTarget - st.s) - SIZE_DAMPING * st.sv) * dt;
      st.s += st.sv * dt;

      // Четдаги чўзилиш
      st.ov += (EDGE_STIFFNESS * (st.oTarget - st.o) - EDGE_DAMPING * st.ov) * dt;
      st.o += st.ov * dt;

      paint();

      const settled =
        Math.abs(st.target - st.x) < 0.2 &&
        Math.abs(st.v) < 2 &&
        Math.abs(st.sTarget - st.s) < 0.002 &&
        Math.abs(st.sv) < 0.01 &&
        Math.abs(st.oTarget - st.o) < 0.2 &&
        Math.abs(st.ov) < 2;

      if (settled) {
        st.x = st.target;
        st.v = 0;
        st.s = st.sTarget;
        st.sv = 0;
        st.o = st.oTarget;
        st.ov = 0;
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
      const st = spring.current;
      st.target = target;

      if (st.x === null || immediate) {
        st.x = target;
        st.v = 0;
        paint();
        return;
      }

      run();
    },
    [paint, run]
  );

  const setPress = useCallback(
    (on) => {
      const st = spring.current;
      st.sTarget = on ? 1 : 0;
      if (st.x !== null) run();
    },
    [run]
  );

  /* ---------- Актив route ---------- */
  useLayoutEffect(() => {
    const slot = getSlots()[activeIndex];
    activeRef.current = activeIndex;

    if (slot && !dragRef.current) {
      animateTo(slot.center, spring.current.x === null);
    }
  }, [activeIndex, animateTo, getSlots]);

  /* ---------- Ўлчам ўзгарганда ---------- */
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const update = () => {
      const slot = getSlots()[activeRef.current];
      if (slot && !dragRef.current) animateTo(slot.center, true);
    };

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;

    observer?.observe(nav);
    linkRefs.current.forEach((el) => el && observer?.observe(el));

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

  const getNearestIndex = (clientX) => {
    const nav = navRef.current;
    const slots = getSlots();
    if (!nav || !slots.length) return -1;

    const localX = clientX - nav.getBoundingClientRect().left;

    let nearest = 0;
    let distance = Infinity;

    slots.forEach((slot, index) => {
      if (!slot) return;
      const diff = Math.abs(slot.center - localX);
      if (diff < distance) {
        distance = diff;
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
    )
      return;

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
    setPress(true);
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

    const slots = getSlots();
    const nav = navRef.current;
    if (!nav || !slots[0]) return;

    const localX = event.clientX - nav.getBoundingClientRect().left;
    const first = slots[0].center;
    const lastC = slots[slots.length - 1].center;

    // Индикатор четки тугмадан нарига чиқмайди
    animateTo(clamp(localX, first, lastC));

    // Бармоқ четдан ўтса, индикатор резинка каби озгина чўзилади
    const slotW = slots[0].width;
    const maxO = slotW * EDGE_STRETCH_MAX;

    let overshoot = 0;
    if (localX > lastC) overshoot = localX - lastC;
    else if (localX < first) overshoot = localX - first; // манфий

    const sign = Math.sign(overshoot);
    const stretched = maxO * (1 - Math.exp(-Math.abs(overshoot) / maxO));

    spring.current.oTarget = sign * stretched;
    run();

    const index = getNearestIndex(event.clientX);
    if (index >= 0) setPreviewIndex(index);
  };

  const finishPress = (event) => {
    dragRef.current = null;
    setPressed(false);
    setPreviewIndex(null);

    spring.current.oTarget = 0; // резинка қайтиб жойлашади
    setPress(false);

    const nav = navRef.current;
    if (nav?.hasPointerCapture(event.pointerId)) {
      nav.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const index = drag.dragging ? getNearestIndex(event.clientX) : drag.index;

    const rect = navRef.current?.getBoundingClientRect();
    const outside = !rect || event.clientY < rect.top - 50 || event.clientY > rect.bottom + 50;

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
  };

  const handlePointerCancel = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    finishPress(event);

    const slot = getSlots()[activeRef.current];
    if (slot) animateTo(slot.center);
  };

  const handleClickCapture = (event) => {
    if (event.detail === 0) return;

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
      <span ref={indicatorRef} className="bottom-nav__indicator" aria-hidden="true" />

      {links.map(({ to, label, Icon }, index) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          draggable={false}
          ref={(element) => {
            linkRefs.current[index] = element;
          }}
          className={`bottom-nav__link${selectedIndex === index ? " is-active" : ""}`}
          onClick={() => {
            if (pathname === to) {
              window.scrollTo({ top: 0, behavior: "instant" });
            }
          }}
          aria-label={label}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
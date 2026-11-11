import {
  startTransition,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

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

/* ------------------------------------------------------------------
   SOZLAMALAR — hissiyotni shu yerdan o'zgartiring
------------------------------------------------------------------- */

// Chromium'da haqiqiy yorug'lik sinishi (refraction). O'chirish: false
const ENABLE_REFRACTION = true;

const PRESS_SCALE = 1.06;       // bosilganda indikator kattalashishi
const BAR_LIFT = 1.006;        // bosilganda butun bar ozgina kattalashadi
const DRAG_THRESHOLD = 4;       // px — surish boshlanishi
const CANCEL_MARGIN = 60;       // px — shundan tashqarida qo'yib yuborilsa bekor

const RUBBER_X = 10;            // px — chekkadan tashqariga cho'zilish chegarasi
const RUBBER_Y = 6;             // px — tepaga/pastga tortilish chegarasi

// Prujinalar: k = qattiqlik, c = so'nish
const SPRING_X_SOFT = { k: 430, c: 31 };  // bosganda (yumshoq o'tish)
const SPRING_X_STIFF = { k: 900, c: 54 }; // surganda (barmoqqa yopishadi)
const SPRING_Y = { k: 320, c: 22 };       // vertikal — "rezinka"
const SPRING_S = { k: 520, c: 28 };       // kattalashish
const STEP = 1 / 120;

const LENS_SCALE = 22;          // refraction kuchi (px * 2)

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

// Rezinka: kichik masofada 1:1, chegaraga yaqinlashganda to'xtaydi
const rubber = (distance, limit) =>
  limit * Math.tanh(distance / limit);

const f = (n) => n.toFixed(3);

const tf = (x, y = 0, sx = 1, sy = sx, skew = 0) =>
  `translate3d(${f(x)}px, ${f(y)}px, 0) scale(${f(sx)}, ${f(sy)}) skewX(${f(skew)}deg)`;

const bodyTf = (x, y, sx, sy) =>
  `translate3d(${f(x)}px, ${f(y)}px, 0) scale(${f(sx)}, ${f(sy)})`;

const BODY_REST = bodyTf(0, 0, 1, 1);

const scrollToTop = () =>
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });

const getActiveIndex = (pathname) =>
  links.findIndex(({ to }) =>
    to === "/"
      ? pathname === "/"
      : pathname === to || pathname.startsWith(`${to}/`)
  );

/* ------------------------------------------------------------------
   Lens xaritasi (refraction uchun displacement map)
   Pill chekkasida piksellar tashqariga qarab siljiydi — shisha
   qirrasidagi egilish effekti.
------------------------------------------------------------------- */

const buildLensMap = (width, height) => {
  const w = Math.max(2, Math.round(width));
  const h = Math.max(2, Math.round(height));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(w, h);
  const radius = h / 2;
  const bezel = Math.min(radius, 16);

  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) {
      const px = i + 0.5;
      const py = j + 0.5;

      const cx = clamp(px, radius, Math.max(radius, w - radius));
      const vx = px - cx;
      const vy = py - radius;
      const length = Math.hypot(vx, vy);

      const depth = radius - length; // chekkadan ichkariga masofa

      let r = 128;
      let g = 128;

      if (depth >= 0 && depth < bezel && length > 1e-6) {
        const strength = Math.pow(1 - depth / bezel, 2.2);

        r = 127.5 + 127.5 * (vx / length) * strength;
        g = 127.5 + 127.5 * (vy / length) * strength;
      }

      const index = (j * w + i) * 4;

      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  return { url: canvas.toDataURL("image/png"), w, h };
};

export default function MobileNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const bodyRef = useRef(null);
  const indicatorRef = useRef(null);
  const filterRef = useRef(null);
  const mapRef = useRef(null);
  const linkRefs = useRef([]);

  const metricsRef = useRef({
    centers: [],
    width: 0,
    originX: 0,
    centerY: 0,
    navWidth: 0,
  });

  const lensRef = useRef({ enabled: false, w: 0, h: 0 });
  const reducedRef = useRef(false);
  const dragRef = useRef(null);
  const activeRef = useRef(-1);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef(0);

  // Faqat barmoq bosib turgan paytda ishlaydigan fizika holati
  const physRef = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    s: 1, sv: 0,
    tx: 0, ty: 0, ts: 1,
    kx: SPRING_X_SOFT.k, cx: SPRING_X_SOFT.c,
    bx: 0, by: 0, bs: 1, bs2: 1,
    btx: 0, bty: 0, bts: 1, bts2: 1,
    raf: 0, last: 0,
  });

  const [previewIndex, setPreviewIndex] = useState(null);

  const activeIndex = getActiveIndex(pathname);
  const selectedIndex = previewIndex ?? activeIndex;

  useLayoutEffect(() => {
    scrollToTop();
  }, [pathname]);

  /* ---------------- Lens ---------------- */

  const updateLens = useCallback((width, height) => {
    const lens = lensRef.current;

    if (!lens.enabled) return;

    const w = Math.round(width);
    const h = Math.round(height);

    if (!w || !h || (lens.w === w && lens.h === h)) return;

    const map = buildLensMap(w, h);
    const filter = filterRef.current;
    const image = mapRef.current;

    if (!map || !filter || !image) return;

    lens.w = w;
    lens.h = h;

    filter.setAttribute("width", String(w));
    filter.setAttribute("height", String(h));

    image.setAttribute("width", String(w));
    image.setAttribute("height", String(h));
    image.setAttribute("href", map.url);
  }, []);

  /* ---------------- O'lchash ---------------- */

  const measure = useCallback(() => {
    const items = linkRefs.current;
    const first = items[0];
    const indicator = indicatorRef.current;

    const width = first ? first.offsetWidth : 0;

    metricsRef.current = {
      ...metricsRef.current,
      centers: items.map((el) =>
        el ? el.offsetLeft + el.offsetWidth / 2 : 0
      ),
      width,
    };

    if (indicator && width) {
      indicator.style.width = `${width}px`;
      updateLens(width, indicator.offsetHeight);
    }
  }, [updateLens]);

  /* ---------------- CSS prujina (bosilmagan holat) ---------------- */

  const place = useCallback((x, { scale = 1, mode = "settle" } = {}) => {
    const indicator = indicatorRef.current;
    const { width } = metricsRef.current;

    if (!indicator || !width) return;

    indicator.dataset.mode = mode;
    indicator.style.transform = tf(x - width / 2, 0, scale, scale, 0);

    if (mode === "instant") {
      void indicator.offsetWidth; // transition'siz yozilganini tasdiqlash
      indicator.dataset.mode = "settle";
    }
  }, []);

  const syncToActive = useCallback(
    (instant = false) => {
      const indicator = indicatorRef.current;
      if (!indicator) return;

      const index = activeRef.current;
      const x = metricsRef.current.centers[index];

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

  /* ---------------- Fizika (faqat bosib turganda) ---------------- */

  const paintPhysics = useCallback(() => {
    const p = physRef.current;
    const indicator = indicatorRef.current;
    const body = bodyRef.current;
    const { width } = metricsRef.current;

    if (!indicator || !body || !width) return;

    // Tezlik va vertikal tortilishga qarab suyuq deformatsiya
    const ax = clamp(Math.abs(p.vx) / 6500, 0, 0.045);
    const ay = clamp(
      Math.abs(p.vy) / 8000 + Math.abs(p.y) / 420,
      0,
      0.035
    );

    const sx = p.s * (1 + ax - ay * 0.45);
    const sy = p.s * (1 + ay - ax * 0.45);
    const skew = clamp(-p.vx / 1400, -1.8, 1.8);

    indicator.style.transform = tf(p.x - width / 2, p.y, sx, sy, skew);
    body.style.transform = bodyTf(p.bx, p.by, p.bs, p.bs2);
  }, []);

  const tick = useCallback(
    function step(time) {
      const p = physRef.current;

      const elapsed = p.last
        ? Math.min((time - p.last) / 1000, 0.032)
        : 1 / 60;

      p.last = time;

      let rest = elapsed;

      while (rest > 0) {
        const h = Math.min(rest, STEP);

        p.vx += (-p.kx * (p.x - p.tx) - p.cx * p.vx) * h;
        p.x += p.vx * h;

        p.vy += (-SPRING_Y.k * (p.y - p.ty) - SPRING_Y.c * p.vy) * h;
        p.y += p.vy * h;

        p.sv += (-SPRING_S.k * (p.s - p.ts) - SPRING_S.c * p.sv) * h;
        p.s += p.sv * h;

        rest -= h;
      }

      // Butun bar yumshoq ergashadi (kadr tezligiga bog'liq emas)
      const k = 1 - Math.exp(-elapsed * 16);

      p.bx += (p.btx - p.bx) * k;
      p.by += (p.bty - p.by) * k;
      p.bs += (p.bts - p.bs) * k;
      p.bs2 += (p.bts2 - p.bs2) * k;

      paintPhysics();

      const settled =
        Math.abs(p.x - p.tx) < 0.05 &&
        Math.abs(p.y - p.ty) < 0.05 &&
        Math.abs(p.vx) < 0.5 &&
        Math.abs(p.vy) < 0.5 &&
        Math.abs(p.s - p.ts) < 0.001 &&
        Math.abs(p.sv) < 0.01 &&
        Math.abs(p.bx - p.btx) < 0.05 &&
        Math.abs(p.by - p.bty) < 0.05 &&
        Math.abs(p.bs - p.bts) < 0.0005 &&
        Math.abs(p.bs2 - p.bts2) < 0.0005;

      if (settled) {
        p.raf = 0;
        p.last = 0;
        return;
      }

      p.raf = requestAnimationFrame(step);
    },
    [paintPhysics]
  );

  const kick = useCallback(() => {
    const p = physRef.current;

    if (reducedRef.current) {
      // Harakatni kamaytirish: deformatsiyasiz, to'g'ridan-to'g'ri
      p.x = p.tx;
      p.y = 0;
      p.vx = 0;
      p.vy = 0;
      p.s = 1;
      p.sv = 0;
      p.bx = 0;
      p.by = 0;
      p.bs = 1;
      p.bs2 = 1;

      paintPhysics();
      return;
    }

    if (!p.raf) {
      p.last = 0;
      p.raf = requestAnimationFrame(tick);
    }
  }, [paintPhysics, tick]);

  const stopPhysics = useCallback(() => {
    const p = physRef.current;

    if (p.raf) cancelAnimationFrame(p.raf);

    p.raf = 0;
    p.last = 0;
  }, []);

  /* ---------------- Effektlar ---------------- */

  useLayoutEffect(() => {
    activeRef.current = activeIndex;

    if (!dragRef.current) {
      measure();
      syncToActive(false);
    }
  }, [activeIndex, measure, syncToActive]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    // Refraction faqat Chromium'da (backdrop-filter: url() shu yerda ishlaydi)
    const isChromium = !!navigator.userAgentData;

    const canRefract =
      ENABLE_REFRACTION &&
      isChromium &&
      typeof CSS !== "undefined" &&
      CSS.supports?.("backdrop-filter", "url(#bakeu-lens) blur(1px)") &&
      (navigator.deviceMemory ?? 8) >= 4 &&
      !window.matchMedia?.("(prefers-reduced-transparency: reduce)")
        ?.matches;

    lensRef.current.enabled = !!canRefract;

    if (canRefract) nav.dataset.refract = "true";

    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    reducedRef.current = !!motion?.matches;

    const onMotion = (event) => {
      reducedRef.current = event.matches;
    };

    motion?.addEventListener?.("change", onMotion);

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
    document.fonts?.ready?.then(update);

    update();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      motion?.removeEventListener?.("change", onMotion);
      window.clearTimeout(suppressTimerRef.current);
      stopPhysics();
    };
  }, [measure, syncToActive, stopPhysics]);

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

  const setPressed = (value) => {
    navRef.current?.toggleAttribute("data-pressed", value);
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
    const indicator = indicatorRef.current;
    const body = bodyRef.current;

    if (!nav || !indicator || !body) return;

    measure();

    const rect = nav.getBoundingClientRect();
    const metrics = metricsRef.current;

    metrics.originX = rect.left;
    metrics.centerY = rect.top + rect.height / 2;
    metrics.navWidth = rect.width;

    const index = getNearestIndex(event.clientX - rect.left);
    if (index < 0) return;

    const p = physRef.current;
    const wasHidden = indicator.dataset.hidden !== "false";

    // Hozirgi ko'rinib turgan holatdan davom etamiz (sakrash bo'lmasin)
    if (wasHidden) {
      p.x = metrics.centers[index];
      p.y = 0;
      p.s = 1;
    } else {
      const im = new DOMMatrix(getComputedStyle(indicator).transform);

      p.x = im.m41 + metrics.width / 2;
      p.y = im.m42;
      p.s = Math.hypot(im.a, im.b) || 1;
    }

    const bm = new DOMMatrix(getComputedStyle(body).transform);

    p.bx = bm.m41;
    p.by = bm.m42;
    p.bs = bm.a || 1;
    p.bs2 = bm.d || 1;

    p.vx = 0;
    p.vy = 0;
    p.sv = 0;

    p.kx = SPRING_X_SOFT.k;
    p.cx = SPRING_X_SOFT.c;

    p.tx = metrics.centers[index];
    p.ty = 0;
    p.ts = PRESS_SCALE;

    p.btx = 0;
    p.bty = 0;
    p.bts = BAR_LIFT;
    p.bts2 = BAR_LIFT;

    dragRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      index,
      dragging: false,
    };

    nav.setPointerCapture(event.pointerId);

    indicator.dataset.hidden = "false";
    indicator.dataset.mode = "physics";

    setPressed(true);
    setPreviewIndex(index);

    paintPhysics();
    kick();
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    const p = physRef.current;

    if (!drag.dragging) {
      const moved = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY
      );

      if (moved < DRAG_THRESHOLD) return;

      drag.dragging = true;
      p.kx = SPRING_X_STIFF.k;
      p.cx = SPRING_X_STIFF.c;
    }

    const { centers, originX, centerY, navWidth } = metricsRef.current;

    const rawX = event.clientX - originX;
    const rawY = event.clientY - centerY;

    const clampedX = clamp(rawX, centers[0], centers[centers.length - 1]);
    const overX = rawX - clampedX;

    // Indikator: chapga/o'ngga erkin, chekkadan tashqarida rezinka,
    // tepaga/pastga ham rezinka bilan tortiladi
    p.tx = clampedX + rubber(overX, RUBBER_X);
    p.ty = rubber(rawY, RUBBER_Y);

    // Butun bar ham barmoq tomonga yengil "tortiladi"
    p.btx = clamp((rawX - navWidth / 2) * 0.012, -3, 3);
    p.bty = clamp(rawY * 0.05, -3, 3);
    p.bts = BAR_LIFT + clamp(Math.abs(overX) / 1200, 0, 0.006);
    p.bts2 = BAR_LIFT + clamp(Math.abs(rawY) / 800, 0, 0.008);

    const index = getNearestIndex(clampedX);

    if (index !== drag.index) {
      drag.index = index;
      setPreviewIndex(index);
    }

    kick();
  };

  const finishPointer = (event, commit) => {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) return;

    dragRef.current = null;

    stopPhysics();

    // Bosilgan holatni olib tashlaymiz — bar CSS prujina bilan joyiga qaytadi
    setPressed(false);
    setPreviewIndex(null);
    releaseCapture(event);

    if (bodyRef.current) bodyRef.current.style.transform = BODY_REST;

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

    startTransition(() => navigate(links[index].to));
  };

  const handlePointerUp = (event) => finishPointer(event, true);
  const handlePointerCancel = (event) => finishPointer(event, false);

  const handleClickCapture = (event) => {
    if (event.detail === 0) return; // klaviatura

    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const navigation = (
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
      {/* Liquid glass lens filtri (Chromium) */}
      <svg
        className="bottom-nav__defs"
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter
            ref={filterRef}
            id="bakeu-lens"
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1"
            height="1"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              ref={mapRef}
              x="0"
              y="0"
              width="1"
              height="1"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={LENS_SCALE}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div ref={bodyRef} className="bottom-nav__body">
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
      </div>
    </nav>
  );

  // Portal: nav har doim <body> ga chiqariladi. Shunda sahifa konteyneridagi
  // transform / filter / overflow / will-change glass va position:fixed ni
  // buzmaydi — har bir sahifada (Profil ham) bir xil ishlaydi.
  return typeof document === "undefined"
    ? navigation
    : createPortal(navigation, document.body);
}
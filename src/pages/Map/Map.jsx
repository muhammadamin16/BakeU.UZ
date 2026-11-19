import { Link } from "react-router-dom";
import {
  getDevicePosition,
  supportsLocation,
  hasNativeLocation,
} from "../../platform/device.js";
import { normalizeSearch } from "../../i18n/alphabet.js";
import { getLocale, matchesLocalizedSearch, translateText } from "../../i18n/index.js";
import { useLanguage } from "../../i18n/useLanguage";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import {
  Search,
  Navigation,
  Star,
  RefreshCw,
  X,
  Plus,
  Minus,
  LocateFixed,
  Info,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./Map.css";

/* =====================================================
   Ma'lumotlar
   ===================================================== */

const products = [
  {
    id: "cookie",
    shopId: "sweet-home",
    name: "ПЕЧЕНЬЕ",
    price: 13200,
    rating: 4.9,
    image: "/images/products/cookie.jpg",
    lat: 41.3142,
    lng: 69.2808,
    seller: "Sweet Home",
  },
  {
    id: "bread",
    shopId: "bakeu",
    name: "ХЛЕБ",
    price: 3400,
    rating: 4.8,
    image: "/images/products/bread.jpg",
    lat: 41.3115,
    lng: 69.2762,
    seller: "BakeU",
  },
  {
    id: "cake",
    shopId: "shahzoda",
    name: "ТОРТ",
    price: 45000,
    rating: 5.0,
    image: "/images/products/cake.jpg",
    lat: 41.3165,
    lng: 69.285,
    seller: "Shahzoda Family",
  },
  {
    id: "somsa",
    shopId: "bakeu",
    name: "САМСА",
    price: 7000,
    rating: 4.7,
    image: "/images/products/somsa.jpg",
    lat: 41.3105,
    lng: 69.2745,
    seller: "BakeU",
  },
  {
    id: "smit",
    shopId: "sweet-home",
    name: "СМИТ",
    price: 12000,
    rating: 4.6,
    image: "/images/products/cookie.jpg",
    lat: 41.317,
    lng: 69.271,
    seller: "Sweet Home",
  },
];

const sellers = [
  {
    id: "bakeu",
    name: "BAKEU",
    badge: "B",
    badgeColor: "#ed792d",
    categories: "Хлеб, самса",
    rating: 4.8,
    lat: 41.3115,
    lng: 69.2762,
    image: "/images/products/bread.jpg",
  },
  {
    id: "shahzoda",
    name: "SHAHZODA FAMILY",
    badge: "S",
    badgeColor: "#8b5cf6",
    categories: "Торты и десерты",
    rating: 5.0,
    lat: 41.3165,
    lng: 69.285,
    image: "/images/products/cake.jpg",
  },
  {
    id: "sweet-home",
    name: "SWEET HOME",
    badge: "S",
    badgeColor: "#4f9d75",
    categories: "Печенье, смиты",
    rating: 4.9,
    lat: 41.3142,
    lng: 69.2808,
    image: "/images/products/cookie.jpg",
  },
];

const SORTS = {
  products: [
    { id: "distance", label: "Рядом" },
    { id: "rating", label: "Рейтинг" },
    { id: "price", label: "Цена" },
  ],
  sellers: [
    { id: "distance", label: "Рядом" },
    { id: "rating", label: "Рейтинг" },
  ],
};

const DEFAULT_CENTER = [41.3128, 69.279];
const STORAGE_KEY = "bakeu_last_pos";
const RADII = [1, 2, 5, 10];
const DEFAULT_RADIUS_KM = 5;
/* CARTO endi API kalit talab qiladi (bepul: carto.com/basemaps/apikey).
   Kalitni shu yerga qo'ying. Bo'sh qoldirsangiz, kalitsiz OpenStreetMap
   plitkalari ishlatiladi. */
const CARTO_KEY = "";

const TILES = CARTO_KEY
  ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`
  : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/* =====================================================
   Yordamchi funksiyalar
   ===================================================== */

const formatPrice = (n) =>
  translateText(`${n.toLocaleString(getLocale())} сум`);

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`;

function getOnce(options) {
  return new Promise((resolve, reject) => {
    getDevicePosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      options,
    );
  });
}

/* 1-qadam: GPS / Wi-Fi orqali (eng aniq) */
async function requestGps() {
  if (!supportsLocation()) {
    throw { reason: "unsupported", detail: "navigator.geolocation yo'q" };
  }
  if (
    !hasNativeLocation() &&
    typeof window !== "undefined" &&
    window.isSecureContext === false
  ) {
    throw { reason: "insecure", detail: "isSecureContext = false" };
  }

  const wrap = (e) => ({
    reason:
      e?.code === 1 ? "denied" : e?.code === 3 ? "timeout" : "unavailable",
    code: e?.code,
    detail: e?.message,
  });

  try {
    return await getOnce({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    });
  } catch (e1) {
    if (e1?.code === 1) throw wrap(e1);
    try {
      return await getOnce({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    } catch (e2) {
      throw wrap(e2);
    }
  }
}

/* 2-qadam: tarmoq (IP) orqali taxminiy joylashuv. GPS ishlamaganda zaxira */
const IP_SERVICES = [
  {
    url: "https://get.geojs.io/v1/ip/geo.json",
    parse: (d) => ({
      lat: parseFloat(d.latitude),
      lng: parseFloat(d.longitude),
    }),
  },
  {
    url: "https://ipapi.co/json/",
    parse: (d) => ({ lat: Number(d.latitude), lng: Number(d.longitude) }),
  },
  {
    url: "https://ipwho.is/",
    parse: (d) => ({ lat: Number(d.latitude), lng: Number(d.longitude) }),
  },
];

async function requestByIp() {
  for (const svc of IP_SERVICES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(svc.url, { signal: ctrl.signal });
      if (!res.ok) continue;
      const pos = svc.parse(await res.json());
      if (Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) return pos;
    } catch {
      /* keyingi xizmatga o'tamiz */
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("ip-lookup-failed");
}

/* Natija: { lat, lng, source: "gps" | "ip" } yoki { reason, code, detail } xatosi */
async function requestPosition({ allowApprox = false } = {}) {
  try {
    return { ...(await requestGps()), source: "gps" };
  } catch (err) {
    /* Foydalanuvchi ruxsatni o'zi rad etgan bo'lsa, IP bilan aylanib o'tmaymiz */
    if (allowApprox && err?.reason !== "denied") {
      try {
        return { ...(await requestByIp()), source: "ip" };
      } catch {
        /* Optional browser capability is unavailable. */
      }
    }
    throw err;
  }
}

function saveLastPos(coords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch {
    /* Optional browser capability is unavailable. */
  }
}

const GEO_MESSAGES = {
  unsupported: "Ваш браузер не поддерживает геолокацию.",
  insecure:
    "Геолокация работает только на защищённом сайте (https). Откройте сайт по https:// или через localhost.",
  denied: "Доступ к геолокации запрещён в браузере.",
  unavailable:
    "Не удалось определить местоположение. Проверьте, что на устройстве включены службы геолокации и интернет.",
  timeout: "Определение заняло слишком много времени. Попробуйте ещё раз.",
  approx:
    "Точное местоположение определить не удалось, поэтому мы показываем его приблизительно (по сети). Для точности разрешите геолокацию или укажите место на карте.",
};

/* Qurilma va brauzerga mos ko'rsatma: ruxsatni faqat foydalanuvchining o'zi
   brauzer sozlamalarida yoqa oladi (kod bilan qayta so'rab bo'lmaydi) */
function deniedHelp() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const inApp = /Telegram|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  const firefox = /Firefox|FxiOS/i.test(ua);

  if (inApp) {
    return "Сайт открыт внутри приложения (Telegram, Instagram и т. п.), где геолокация обычно заблокирована. Откройте его в Chrome или Safari.";
  }
  if (ios) {
    return "Включите: «Настройки» → «Конфиденциальность и безопасность» → «Службы геолокации» → Safari → «При использовании». Затем в Safari нажмите «aA» → «Настройки веб-сайта» → «Геопозиция» → «Разрешить» и нажмите «Повторить».";
  }
  if (android) {
    return "Нажмите на значок слева от адреса сайта → «Разрешения» → «Геолокация» → «Разрешить», затем нажмите «Повторить».";
  }
  if (firefox) {
    return "Нажмите на значок слева от адреса сайта, снимите блокировку у пункта «Доступ к местоположению» и нажмите «Повторить».";
  }
  return "Нажмите на значок слева от адреса сайта → «Настройки сайта» → «Геолокация» → «Разрешить», затем нажмите «Повторить».";
}

const USER_LABELS = {
  gps: "Вы здесь",
  ip: "Примерно здесь",
  manual: "Ваша точка",
};

/* =====================================================
   Marker ikonlari
   ===================================================== */

const priceIcon = (price, selected) =>
  L.divIcon({
    className: "map-marker",
    html: `<div class="price-pill ${selected ? "is-selected" : ""}">${formatPrice(price)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const sellerIcon = (badge, color, selected) =>
  L.divIcon({
    className: "map-marker",
    html: `<div class="seller-pill ${selected ? "is-selected" : ""}" style="background:${color}">${badge}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const makeUserIcon = (label) =>
  L.divIcon({
    className: "map-marker",
    html: `<div class="user-dot"><span class="user-dot__pulse"></span><span class="user-dot__core"></span><span class="user-dot__label">${label}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

/* =====================================================
   Xarita ichidagi yordamchi komponentlar
   ===================================================== */

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.85 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], zoom, map]);
  return null;
}

/* Foydalanuvchi hududini (radius) butunlay ko'rinadigan qilib moslashtiradi */
function FitArea({ center, radiusKm }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    const bounds = L.latLng(center).toBounds(radiusKm * 2000);
    map.flyToBounds(bounds, {
      paddingTopLeft: [30, 90],
      paddingBottomRight: [70, 80],
      duration: 0.85,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], radiusKm, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick?.(e.latlng) });
  return null;
}

/* =====================================================
   Asosiy komponent
   ===================================================== */

export default function MapPage() {
  const language = useLanguage();
  const [activeTab, setActiveTab] = useState("products");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [userPos, setUserPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(saved?.lat) && Number.isFinite(saved?.lng)
        ? saved
        : null;
    } catch {
      return null;
    }
  });
  const [nearMe, setNearMe] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [pickMode, setPickMode] = useState(false);
  const [geoDebug, setGeoDebug] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  const cardRefs = useRef({});
  const searchRef = useRef(null);
  const posRef = useRef(null);
  const wantNearRef = useRef(false);

  const posSource = userPos?.source || "gps";
  const userIcon = useMemo(
    () =>
      makeUserIcon(
        translateText(USER_LABELS[posSource] || USER_LABELS.gps, language),
      ),
    [posSource, language],
  );

  useEffect(() => {
    posRef.current = userPos;
  }, [userPos]);

  /* Joylashuvni aniqlash (kerak bo'lsa ruxsat so'raydi) */
  const ensurePosition = useCallback(async ({ silent = false } = {}) => {
    /* Jimgina yangilash qo'lda belgilangan nuqtani buzmasligi kerak */
    if (silent && posRef.current?.source === "manual") return null;

    if (!silent) {
      setGeoError("");
      setGeoDebug("");
      setLoadingGeo(true);
    }
    try {
      const coords = await requestPosition({ allowApprox: !silent });
      setUserPos(coords);
      saveLastPos(coords);
      if (!silent && coords.source === "ip") setGeoError("approx");
      return coords;
    } catch (err) {
      if (!silent) {
        setGeoError(err?.reason || "unavailable");

        let perm = "n/a";
        try {
          perm = (await navigator.permissions.query({ name: "geolocation" }))
            .state;
        } catch {
          /* Optional browser capability is unavailable. */
        }
        setGeoDebug(
          [
            `reason: ${err?.reason || "unknown"}`,
            err?.code != null && `code: ${err.code}`,
            err?.detail && `message: ${err.detail}`,
            `secure: ${String(window.isSecureContext)}`,
            `permission: ${perm}`,
            `origin: ${window.location.origin}`,
          ]
            .filter(Boolean)
            .join(" · "),
        );
      }
      return null;
    } finally {
      if (!silent) setLoadingGeo(false);
    }
  }, []);

  /* Ruxsat berilsa (avval yoki sozlamalarda keyin), avtomatik tiklanamiz */
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let status;
    const refresh = async () => {
      if (status?.state !== "granted") return;
      setGeoError((e) => (e === "denied" ? "" : e));
      const pos = await ensurePosition({ silent: true });
      if (pos && wantNearRef.current) {
        wantNearRef.current = false;
        setNearMe(true);
      }
    };
    navigator.permissions
      .query({ name: "geolocation" })
      .then((st) => {
        status = st;
        refresh();
        st.onchange = refresh;
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
  }, [ensurePosition]);

  const toggleNearMe = useCallback(async () => {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    setGeoError("");
    setPickMode(false);
    if (userPos) {
      setNearMe(true);
      ensurePosition({ silent: true }); /* eskirgan nuqtani yangilash */
      return;
    }
    const pos = await ensurePosition();
    if (pos) {
      wantNearRef.current = false;
      setNearMe(true);
    } else {
      wantNearRef.current = true; /* ruxsat berilgach avtomatik yoqiladi */
    }
  }, [nearMe, userPos, ensurePosition]);

  /* "Повторить": sozlamani o'zgartirgandan keyin qayta urinish */
  const retryGeo = async () => {
    const pos = await ensurePosition();
    if (pos) {
      wantNearRef.current = false;
      setNearMe(true);
    }
  };

  /* Foydalanuvchi o'zi tanlaganda: tarmoq orqali taxminiy joylashuv */
  const approxLocate = async () => {
    setGeoError("");
    setGeoDebug("");
    setLoadingGeo(true);
    try {
      const pos = { ...(await requestByIp()), source: "ip" };
      setUserPos(pos);
      saveLastPos(pos);
      setNearMe(true);
      setGeoError("approx");
    } catch {
      setGeoError("unavailable");
    } finally {
      setLoadingGeo(false);
    }
  };

  const locateMe = useCallback(async () => {
    setPickMode(false);
    const pos = await ensurePosition();
    if (pos && mapInstance) {
      setSelectedId(null);
      mapInstance.flyTo([pos.lat, pos.lng], pos.source === "ip" ? 13 : 16, {
        duration: 0.85,
      });
    }
  }, [ensurePosition, mapInstance]);

  /* Qo'lda belgilash: avtomatik aniqlash ishlamasa */
  const startPick = () => {
    setGeoError("");
    setGeoDebug("");
    setSelectedId(null);
    setPickMode(true);
  };

  const handleMapClick = (latlng) => {
    if (pickMode && latlng) {
      const coords = { lat: latlng.lat, lng: latlng.lng, source: "manual" };
      setUserPos(coords);
      saveLastPos(coords);
      setNearMe(true);
      setPickMode(false);
      return;
    }
    setSelectedId(null);
    setCreditsOpen(false);
  };

  /* Filtrlangan va tartiblangan ro'yxat */
  const filtered = useMemo(() => {
    const source = activeTab === "products" ? products : sellers;

    let list = source.map((item) => ({
      ...item,
      distance: userPos
        ? getDistance(userPos.lat, userPos.lng, item.lat, item.lng)
        : null,
    }));

    if (nearMe && userPos) {
      list = list.filter((i) => i.distance != null && i.distance <= radiusKm);
    }

    const q = normalizeSearch(query);
    if (q) {
      list = list.filter((item) => {
        const extra = activeTab === "products" ? item.seller : item.categories;
        return matchesLocalizedSearch(q, item.name, extra);
      });
    }

    list.sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price" && activeTab === "products")
        return a.price - b.price;
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });

    return list;
  }, [activeTab, query, nearMe, userPos, sortBy, radiusKm]);

  const selected = filtered.find((i) => i.id === selectedId) || null;
  const selectedShop = selected?.shopId ?? selected?.id;
  const detailPath = activeTab === "products" && selected?.id !== "smit"
    ? `/product/${selected?.id}`
    : `/seller?shop=${selectedShop}`;

  /* Tanlanganda ro'yxatda ko'rinishga keltirish */
  useEffect(() => {
    cardRefs.current[selectedId]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId]);

  const reset = () => {
    setQuery("");
    setNearMe(false);
    setSelectedId(null);
    setGeoError("");
    setSortBy("distance");
    setRadiusKm(DEFAULT_RADIUS_KM);
  };

  const nextRadius = RADII.find((r) => r > radiusKm);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSelectedId(null);
    setQuery("");
    setSortBy("distance");
  };

  const meta = (item) => {
    const first =
      activeTab === "products" ? formatPrice(item.price) : item.categories;
    return item.distance != null
      ? `${first} · ${formatDistance(item.distance)}`
      : first;
  };

  return (
    <div className="map">
      <div className="map-layout">
        {/* ===== Chap panel ===== */}
        <aside className="map-sidebar">
          <div className="map-tabs" role="tablist">
            {[
              ["sellers", "Продавцы"],
              ["products", "Товары"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                className={`map-tab ${activeTab === id ? "is-active" : ""}`}
                onClick={() => changeTab(id)}
              >
                {translateText(label)}
              </button>
            ))}
          </div>

          <div className="map-sort-row">
            <div
              className="map-chips"
              role="group"
              aria-label={translateText("Сортировка")}
            >
              {SORTS[activeTab].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`map-chip ${sortBy === s.id ? "is-active" : ""}`}
                  aria-pressed={sortBy === s.id}
                  onClick={() => setSortBy(s.id)}
                >
                  {translateText(s.label)}
                </button>
              ))}
            </div>
            <span className="map-count" aria-label={translateText("Найдено")}>
              {filtered.length}
            </span>
          </div>

          {nearMe && (
            <div
              className="map-radius"
              role="group"
              aria-label={translateText("Радиус поиска")}
            >
              <span className="map-radius__label">
                {translateText("Радиус")}
              </span>
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`map-chip ${radiusKm === r ? "is-active" : ""}`}
                  aria-pressed={radiusKm === r}
                  onClick={() => setRadiusKm(r)}
                >
                  {translateText(r)}
                  {translateText(" км")}
                </button>
              ))}
            </div>
          )}

          <div className="map-list">
            {filtered.length === 0 ? (
              <div className="map-empty">
                <p>
                  {translateText(
                    nearMe
                      ? `В радиусе ${radiusKm} км ничего нет`
                      : "Ничего не найдено",
                  )}
                </p>
                {nearMe && nextRadius ? (
                  <button type="button" onClick={() => setRadiusKm(nextRadius)}>
                    {translateText("Увеличить до ")}
                    {nextRadius}
                    {translateText(" км")}
                  </button>
                ) : (
                  <button type="button" onClick={reset}>
                    {translateText("Сбросить")}
                  </button>
                )}
              </div>
            ) : (
              filtered.map((item, index) => (
                <button
                  key={item.id}
                  ref={(el) => {
                    cardRefs.current[item.id] = el;
                  }}
                  type="button"
                  className={`map-card ${selectedId === item.id ? "is-selected" : ""}`}
                  aria-current={selectedId === item.id ? "true" : undefined}
                  onClick={() => setSelectedId(item.id)}
                >
                  <img
                    src={item.image}
                    alt=""
                    className="map-card__img"
                    loading="lazy"
                  />
                  <div className="map-card__info">
                    <div className="map-card__title">
                      <h3>{translateText(item.name, language)}</h3>
                      {index === 0 &&
                        sortBy === "distance" &&
                        item.distance != null &&
                        filtered.length > 1 && (
                          <span className="map-card__tag">
                            {translateText("Ближайший")}
                          </span>
                        )}
                    </div>
                    <p>
                      {translateText(meta(item))}
                      <span className="map-card__star">
                        <Star size={11} fill="#f4b41b" stroke="#f4b41b" />
                        {translateText(item.rating.toFixed(1))}
                      </span>
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ===== Xarita ===== */}
        <section className={`map-area ${pickMode ? "is-picking" : ""}`}>
          <div className="map-toolbar">
            <div className="map-search" role="search">
              <Search size={20} strokeWidth={1.8} />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={translateText("Искать в этой области")}
                placeholder={translateText("Искать в этой области")}
              />
              {query && (
                <button
                  type="button"
                  className="map-search__clear"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  aria-label={translateText("Очистить")}
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              )}
            </div>
            <button
              type="button"
              className="map-round"
              onClick={reset}
              aria-label={translateText("Сбросить")}
            >
              <RefreshCw size={18} strokeWidth={2} />
            </button>
          </div>

          {nearMe && userPos && !pickMode && (
            <div className="map-zone" aria-live="polite">
              <span className="map-zone__dot" />
              {translateText("Ваша зона · ")}
              {radiusKm}
              {translateText(" км · найдено ")}
              {filtered.length}
              {translateText(posSource === "ip" && " · примерно")}
            </div>
          )}

          <div className="map-canvas">
            <MapContainer
              ref={setMapInstance}
              center={DEFAULT_CENTER}
              zoom={14}
              minZoom={10}
              maxZoom={18}
              zoomSnap={0.5}
              zoomDelta={0.5}
              scrollWheelZoom
              className="leaflet-map"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer url={TILES} maxZoom={19} />

              <MapClickHandler onMapClick={handleMapClick} />

              {filtered.map((item) => {
                const isSel = selectedId === item.id;
                return (
                  <Marker
                    key={`${activeTab}-${item.id}`}
                    position={[item.lat, item.lng]}
                    icon={
                      activeTab === "products"
                        ? priceIcon(item.price, isSel)
                        : sellerIcon(item.badge, item.badgeColor, isSel)
                    }
                    zIndexOffset={isSel ? 1000 : 0}
                    eventHandlers={{ click: () => setSelectedId(item.id) }}
                  />
                );
              })}

              {userPos && (
                <>
                  <Marker
                    position={[userPos.lat, userPos.lng]}
                    icon={userIcon}
                    zIndexOffset={2000}
                    interactive={false}
                  />
                  <Circle
                    center={[userPos.lat, userPos.lng]}
                    radius={radiusKm * 1000}
                    interactive={false}
                    pathOptions={
                      nearMe
                        ? {
                            color: "#4f9d75",
                            fillColor: "#4f9d75",
                            fillOpacity: 0.13,
                            weight: 2,
                            dashArray: "7 7",
                          }
                        : {
                            color: "#432015",
                            fillColor: "#432015",
                            fillOpacity: 0.03,
                            weight: 1,
                            opacity: 0.35,
                            dashArray: "4 8",
                          }
                    }
                  />
                </>
              )}

              {selected && (
                <FlyTo center={[selected.lat, selected.lng]} zoom={15} />
              )}
              {nearMe && userPos && !selected && (
                <FitArea
                  center={[userPos.lat, userPos.lng]}
                  radiusKm={radiusKm}
                />
              )}
            </MapContainer>
          </div>

          {/* O'z boshqaruv tugmalari */}
          <div className="map-controls">
            <div className="map-zoom">
              <button
                type="button"
                onClick={() => mapInstance?.zoomIn()}
                aria-label={translateText("Приблизить")}
              >
                <Plus size={18} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => mapInstance?.zoomOut()}
                aria-label={translateText("Отдалить")}
              >
                <Minus size={18} strokeWidth={2.2} />
              </button>
            </div>
            <button
              type="button"
              className="map-round"
              onClick={locateMe}
              disabled={loadingGeo}
              aria-label={translateText("Моё местоположение")}
            >
              <LocateFixed size={19} strokeWidth={2} />
            </button>
          </div>

          {/* Mualliflik ma'lumoti: litsenziya talabi, bosilganda ochiladi */}
          <div className="map-credits">
            <button
              type="button"
              className="map-credits__btn"
              onClick={() => setCreditsOpen((v) => !v)}
              aria-expanded={creditsOpen}
              aria-label={translateText("Источники карты")}
            >
              <Info size={15} strokeWidth={2.2} />
            </button>
            {creditsOpen && (
              <div className="map-credits__panel">
                {translateText("Данные карты ©")}{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap
                </a>
                {CARTO_KEY && (
                  <>
                    , ©{" "}
                    <a
                      href="https://carto.com/attributions"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CARTO
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {selected && (
            <div className="map-detail">
              <img src={selected.image} alt="" className="map-detail__img" />
              <div className="map-detail__info">
                <h3>{translateText(selected.name)}</h3>
                <p>{translateText(meta(selected))}</p>
                <span className="map-card__star">
                  <Star size={12} fill="#f4b41b" stroke="#f4b41b" />
                  {translateText(selected.rating.toFixed(1))}
                </span>
              </div>
              <div className="map-detail__actions">
                <Link className="map-btn map-btn--dark" to={detailPath}>
                  {translateText("Подробнее")}
                </Link>
                <Link className="map-btn map-btn--light" to={`/messages?seller=${selectedShop}`}>
                  {translateText("Написать")}
                </Link>
              </div>
              <button
                type="button"
                className="map-detail__close"
                onClick={() => setSelectedId(null)}
                aria-label={translateText("Закрыть")}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
          )}

          <button
            type="button"
            className={`map-near ${nearMe ? "is-active" : ""}`}
            onClick={toggleNearMe}
            disabled={loadingGeo}
            aria-pressed={nearMe}
          >
            <Navigation size={15} strokeWidth={2.2} />
            {translateText(loadingGeo ? "Определяем…" : "Рядом со мной")}
          </button>

          {pickMode && (
            <div className="map-pick" role="status">
              <span>
                {translateText(
                  "Нажмите на карту, чтобы указать, где вы находитесь",
                )}
              </span>
              <button type="button" onClick={() => setPickMode(false)}>
                {translateText("Отмена")}
              </button>
            </div>
          )}

          {geoError && (
            <div
              className={`map-geo-error ${geoError === "approx" ? "is-info" : ""}`}
              role="alert"
            >
              <p>
                {translateText(
                  geoError === "denied"
                    ? `${GEO_MESSAGES.denied} ${deniedHelp()}`
                    : GEO_MESSAGES[geoError] || GEO_MESSAGES.unavailable,
                )}
              </p>

              {geoDebug && geoError !== "approx" && (
                <details className="map-geo-error__debug">
                  <summary>{translateText("Технические детали")}</summary>
                  <code>{translateText(geoDebug)}</code>
                </details>
              )}

              {geoError === "approx" ? (
                <div className="map-geo-error__actions">
                  <button
                    type="button"
                    className="map-geo-error__btn is-primary"
                    onClick={startPick}
                  >
                    {translateText("Указать точнее")}
                  </button>
                  <button
                    type="button"
                    className="map-geo-error__btn"
                    onClick={() => setGeoError("")}
                  >
                    {translateText("Ок")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="map-geo-error__actions is-stacked">
                    <button
                      type="button"
                      className="map-geo-error__btn is-primary"
                      onClick={startPick}
                    >
                      {translateText("Указать на карте")}
                    </button>
                    {["denied", "unavailable", "timeout"].includes(
                      geoError,
                    ) && (
                      <button
                        type="button"
                        className="map-geo-error__btn"
                        onClick={retryGeo}
                        disabled={loadingGeo}
                      >
                        {translateText("Повторить")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="map-geo-error__btn"
                      onClick={() => setGeoError("")}
                    >
                      {translateText("Закрыть")}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="map-geo-error__link"
                    onClick={approxLocate}
                    disabled={loadingGeo}
                  >
                    {translateText("Определить примерно по сети.")}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

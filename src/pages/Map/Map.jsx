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
    id: "sweethome",
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

const formatPrice = (n) => `${n.toLocaleString("ru-RU")} сум`;

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

function requestPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    );
  });
}

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

const userIcon = L.divIcon({
  className: "map-marker",
  html: `<div class="user-dot"><span class="user-dot__pulse"></span><span class="user-dot__core"></span><span class="user-dot__label">Вы здесь</span></div>`,
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
  useMapEvents({ click: () => onMapClick?.() });
  return null;
}

/* =====================================================
   Asosiy komponent
   ===================================================== */

export default function MapPage() {
  const [activeTab, setActiveTab] = useState("products");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [nearMe, setNearMe] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  const cardRefs = useRef({});

  /* Saqlangan oxirgi joylashuv (brauzer ruxsat so'ramaydi) */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.lat && saved?.lng) setUserPos(saved);
    } catch {}
  }, []);

  /* Xatolik xabari o'zi yo'qoladi */
  useEffect(() => {
    if (!geoError) return;
    const t = setTimeout(() => setGeoError(""), 4500);
    return () => clearTimeout(t);
  }, [geoError]);

  /* Joylashuvni aniqlash (kerak bo'lsa ruxsat so'raydi) */
  const ensurePosition = useCallback(async () => {
    setGeoError("");
    setLoadingGeo(true);
    try {
      const coords = await requestPosition();
      setUserPos(coords);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
      } catch {}
      return coords;
    } catch (err) {
      setGeoError(
        err?.code === 1
          ? "Нет доступа к геолокации. Разрешите его в настройках браузера."
          : err?.code === 0
            ? "Геолокация не поддерживается"
            : "Не удалось определить местоположение"
      );
      return null;
    } finally {
      setLoadingGeo(false);
    }
  }, []);

  const toggleNearMe = useCallback(async () => {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    const pos = userPos || (await ensurePosition());
    if (pos) setNearMe(true);
  }, [nearMe, userPos, ensurePosition]);

  const locateMe = useCallback(async () => {
    const pos = userPos || (await ensurePosition());
    if (pos && mapInstance) {
      setSelectedId(null);
      mapInstance.flyTo([pos.lat, pos.lng], 16, { duration: 0.85 });
    }
  }, [userPos, ensurePosition, mapInstance]);

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

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const extra = activeTab === "products" ? item.seller : item.categories;
        return (
          item.name.toLowerCase().includes(q) ||
          extra?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price" && activeTab === "products") return a.price - b.price;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });

    return list;
  }, [activeTab, query, nearMe, userPos, sortBy, radiusKm]);

  const selected = filtered.find((i) => i.id === selectedId) || null;

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
    <main className="map">
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
                {label}
              </button>
            ))}
          </div>

          <div className="map-sort-row">
            <div className="map-chips" role="group" aria-label="Сортировка">
              {SORTS[activeTab].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`map-chip ${sortBy === s.id ? "is-active" : ""}`}
                  aria-pressed={sortBy === s.id}
                  onClick={() => setSortBy(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <span className="map-count" aria-label="Найдено">
              {filtered.length}
            </span>
          </div>

          {nearMe && (
            <div className="map-radius" role="group" aria-label="Радиус поиска">
              <span className="map-radius__label">Радиус</span>
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`map-chip ${radiusKm === r ? "is-active" : ""}`}
                  aria-pressed={radiusKm === r}
                  onClick={() => setRadiusKm(r)}
                >
                  {r} км
                </button>
              ))}
            </div>
          )}

          <div className="map-list">
            {filtered.length === 0 ? (
              <div className="map-empty">
                <p>
                  {nearMe
                    ? `В радиусе ${radiusKm} км ничего нет`
                    : "Ничего не найдено"}
                </p>
                {nearMe && nextRadius ? (
                  <button type="button" onClick={() => setRadiusKm(nextRadius)}>
                    Увеличить до {nextRadius} км
                  </button>
                ) : (
                  <button type="button" onClick={reset}>
                    Сбросить
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
                      <h3>{item.name}</h3>
                      {index === 0 &&
                        sortBy === "distance" &&
                        item.distance != null &&
                        filtered.length > 1 && (
                          <span className="map-card__tag">Ближайший</span>
                        )}
                    </div>
                    <p>
                      {meta(item)}
                      <span className="map-card__star">
                        <Star size={11} fill="#f4b41b" stroke="#f4b41b" />
                        {item.rating.toFixed(1)}
                      </span>
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ===== Xarita ===== */}
        <section className="map-area">
          <div className="map-toolbar">
            <label className="map-search">
              <Search size={20} strokeWidth={1.8} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Искать в этой области"
              />
              {query && (
                <button
                  type="button"
                  className="map-search__clear"
                  onClick={() => setQuery("")}
                  aria-label="Очистить"
                >
                  <X size={16} strokeWidth={2.2} />
                </button>
              )}
            </label>
            <button
              type="button"
              className="map-round"
              onClick={reset}
              aria-label="Сбросить"
            >
              <RefreshCw size={18} strokeWidth={2} />
            </button>
          </div>

          {nearMe && userPos && (
            <div className="map-zone" aria-live="polite">
              <span className="map-zone__dot" />
              Ваша зона · {radiusKm} км · найдено {filtered.length}
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

              <MapClickHandler
                onMapClick={() => {
                  setSelectedId(null);
                  setCreditsOpen(false);
                }}
              />

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
                aria-label="Приблизить"
              >
                <Plus size={18} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => mapInstance?.zoomOut()}
                aria-label="Отдалить"
              >
                <Minus size={18} strokeWidth={2.2} />
              </button>
            </div>
            <button
              type="button"
              className="map-round"
              onClick={locateMe}
              disabled={loadingGeo}
              aria-label="Моё местоположение"
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
              aria-label="Источники карты"
            >
              <Info size={15} strokeWidth={2.2} />
            </button>
            {creditsOpen && (
              <div className="map-credits__panel">
                Данные карты ©{" "}
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
                <h3>{selected.name}</h3>
                <p>{meta(selected)}</p>
                <span className="map-card__star">
                  <Star size={12} fill="#f4b41b" stroke="#f4b41b" />
                  {selected.rating.toFixed(1)}
                </span>
              </div>
              <div className="map-detail__actions">
                <button type="button" className="map-btn map-btn--dark">
                  Подробнее
                </button>
                <button type="button" className="map-btn map-btn--light">
                  Написать
                </button>
              </div>
              <button
                type="button"
                className="map-detail__close"
                onClick={() => setSelectedId(null)}
                aria-label="Закрыть"
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
            {loadingGeo ? "Определяем..." : "Рядом со мной"}
          </button>

          {geoError && (
            <div className="map-geo-error" role="alert">
              {geoError}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
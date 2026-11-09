import { useState, useEffect, useMemo, useCallback } from "react";
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
  ArrowUpDown,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./Map.css";

const createPriceIcon = (price, isSelected = false) =>
  L.divIcon({
    className: "price-marker",
    html: `<div class="price-pill ${isSelected ? "is-selected" : ""}">${price.toLocaleString("ru-RU")} сум</div>`,
    iconSize: [120, 34],
    iconAnchor: [60, 17],
  });

const createSellerIcon = (badge, color, isSelected = false) =>
  L.divIcon({
    className: "seller-marker",
    html: `<div class="seller-pill ${isSelected ? "is-selected" : ""}" style="background:${color}">${badge}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createUserIcon = () =>
  L.divIcon({
    className: "user-marker",
    html: `<div class="marker-me">me</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
  });

const createDotIcon = () =>
  L.divIcon({
    className: "dot-marker",
    html: `<div class="map-dot"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 0.85 });
    }
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: () => onMapClick?.(),
  });
  return null;
}

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
    sellerId: "sweethome",
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
    sellerId: "bakeu",
  },
  {
    id: "cake",
    name: "ТОРТ",
    price: 45000,
    rating: 5.0,
    image: "/images/products/cake.jpg",
    lat: 41.3165,
    lng: 69.2850,
    seller: "Shahzoda Family",
    sellerId: "shahzoda",
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
    sellerId: "bakeu",
  },
  {
    id: "smit",
    name: "СМИТ",
    price: 12000,
    rating: 4.6,
    image: "/images/products/cookie.jpg",
    lat: 41.3170,
    lng: 69.2710,
    seller: "Sweet Home",
    sellerId: "sweethome",
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
    lng: 69.2850,
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

const defaultCenter = [41.3128, 69.2790];
const STORAGE_KEY = "bakeu_last_pos";
const NEAR_RADIUS_KM = 4;

export default function Map() {
  const [activeTab, setActiveTab] = useState("products");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [nearMe, setNearMe] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [sortBy, setSortBy] = useState("distance");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos?.lat && pos?.lng) {
          setUserPos(pos);
        }
      }
    } catch {}

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserPos(coords);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
        } catch {}
      },
      () => {},
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      }
    );
  }, []);

  const getLocation = useCallback(() => {
    setGeoError("");

    if (userPos) {
      setNearMe(true);
      setLoadingGeo(false);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError("Геолокация не поддерживается");
      return;
    }

    setLoadingGeo(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserPos(coords);
        setNearMe(true);
        setLoadingGeo(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
        } catch {}
      },
      (err) => {
        setLoadingGeo(false);
        setGeoError(
          err.code === 1
            ? "Разрешение не дано. Разрешите доступ к геолокации."
            : "Не удалось определить местоположение"
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300000,
      }
    );
  }, [userPos]);

  const sourceList = activeTab === "products" ? products : sellers;

  const filtered = useMemo(() => {
    let list = sourceList.map((item) => {
      let distance = null;
      if (userPos) {
        distance = getDistance(userPos.lat, userPos.lng, item.lat, item.lng);
      }
      return { ...item, distance };
    });

    if (nearMe && userPos) {
      list = list.filter(
        (item) => item.distance != null && item.distance <= NEAR_RADIUS_KM
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((item) => {
        if (activeTab === "products") {
          return (
            item.name.toLowerCase().includes(q) ||
            item.seller?.toLowerCase().includes(q)
          );
        }
        return (
          item.name.toLowerCase().includes(q) ||
          item.categories?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "price" && activeTab === "products") {
        return (a.price || 0) - (b.price || 0);
      }
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });

    return list;
  }, [activeTab, query, nearMe, userPos, sortBy, sourceList]);

  const selected =
    activeTab === "products"
      ? products.find((p) => p.id === selectedId)
      : sellers.find((s) => s.id === selectedId);

  const selectedWithDist = filtered.find((item) => item.id === selectedId);

  const handleReset = () => {
    setQuery("");
    setNearMe(false);
    setSelectedId(null);
    setGeoError("");
    setSortBy("distance");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedId(null);
    setQuery("");
  };

  const cycleSort = () => {
    setSortBy((prev) => {
      if (prev === "distance") return "rating";
      if (prev === "rating") return activeTab === "products" ? "price" : "distance";
      return "distance";
    });
  };

  const sortLabel =
    sortBy === "distance"
      ? "По расстоянию!"
      : sortBy === "rating"
        ? "По рейтингу!"
        : "По цене!";

  return (
    <main className="container map">
      <div className="map-layout">
        <aside className="map-sidebar">
          <div className="map-tabs">
            <button
              type="button"
              className={`map-tab ${activeTab === "sellers" ? "is-active" : ""}`}
              onClick={() => handleTabChange("sellers")}
            >
              Продавцы
            </button>
            <button
              type="button"
              className={`map-tab ${activeTab === "products" ? "is-active" : ""}`}
              onClick={() => handleTabChange("products")}
            >
              Товары
            </button>
          </div>

          <div className="map-sort-row">
            <button type="button" className="map-sort-btn" onClick={cycleSort}>
              <ArrowUpDown size={14} strokeWidth={2.2} />
              {sortLabel}
            </button>
          </div>

          <div className="map-list">
            {filtered.length === 0 ? (
              <div className="map-empty">
                <p>Ничего не найдено</p>
                <button type="button" onClick={handleReset}>
                  Сбросить
                </button>
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`map-card ${selectedId === item.id ? "is-selected" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="map-card__img"
                  />
                  <div className="map-card__info">
                    <h3>{item.name}</h3>
                    <p>
                      {activeTab === "products" ? (
                        <>
                          {item.price.toLocaleString("ru-RU")} сум
                          {item.distance != null && (
                            <> · {item.distance.toFixed(1)} км</>
                          )}
                        </>
                      ) : (
                        <>
                          {item.categories}
                          {item.distance != null && (
                            <> · {item.distance.toFixed(1)} км</>
                          )}
                        </>
                      )}
                      {" · "}
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
            </label>
            <button
              type="button"
              className="map-refresh"
              onClick={handleReset}
              aria-label="Сбросить"
            >
              <RefreshCw size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="map-canvas">
            <MapContainer
              center={defaultCenter}
              zoom={14}
              scrollWheelZoom
              className="leaflet-map"
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />

              <MapClickHandler onMapClick={() => setSelectedId(null)} />

              {activeTab === "products"
                ? products.map((p) => (
                    <Marker
                      key={p.id}
                      position={[p.lat, p.lng]}
                      icon={createPriceIcon(p.price, selectedId === p.id)}
                      eventHandlers={{ click: () => setSelectedId(p.id) }}
                    />
                  ))
                : sellers.map((s) => (
                    <Marker
                      key={s.id}
                      position={[s.lat, s.lng]}
                      icon={createSellerIcon(
                        s.badge,
                        s.badgeColor,
                        selectedId === s.id
                      )}
                      eventHandlers={{ click: () => setSelectedId(s.id) }}
                    />
                  ))}

              {[
                [41.3138, 69.2825],
                [41.3152, 69.2775],
                [41.3095, 69.2805],
                [41.3172, 69.2835],
                [41.3120, 69.2865],
                [41.3145, 69.2715],
              ].map((pos, i) => (
                <Marker key={`dot-${i}`} position={pos} icon={createDotIcon()} />
              ))}

              {userPos && (
                <>
                  <Marker
                    position={[userPos.lat, userPos.lng]}
                    icon={createUserIcon()}
                  />
                  {nearMe && (
                    <Circle
                      center={[userPos.lat, userPos.lng]}
                      radius={NEAR_RADIUS_KM * 1000}
                      pathOptions={{
                        color: "#4f9d75",
                        fillColor: "#4f9d75",
                        fillOpacity: 0.12,
                        weight: 2,
                      }}
                    />
                  )}
                </>
              )}

              {selected && (
                <FlyTo center={[selected.lat, selected.lng]} zoom={15} />
              )}
              {nearMe && userPos && !selected && (
                <FlyTo center={[userPos.lat, userPos.lng]} zoom={14} />
              )}
            </MapContainer>
          </div>

          {selected && (
            <div className="map-detail">
              <div className="map-detail__info">
                <h3>{selected.name}</h3>
                <p>
                  {activeTab === "products"
                    ? `${selected.price.toLocaleString("ru-RU")} сум`
                    : selected.categories}
                  {selectedWithDist?.distance != null
                    ? ` · ${selectedWithDist.distance.toFixed(1)} км`
                    : ""}
                </p>
              </div>
              <div className="map-detail__actions">
                <button type="button" className="map-btn map-btn--dark">
                  Подробнее
                </button>
                <button type="button" className="map-btn map-btn--light">
                  Написать
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className={`map-near ${nearMe ? "is-active" : ""} ${
              loadingGeo ? "is-loading" : ""
            }`}
            onClick={getLocation}
            disabled={loadingGeo}
          >
            <Navigation size={15} strokeWidth={2.2} />
            {loadingGeo ? "Определяем..." : "Рядом со мной"}
          </button>

          {geoError && <div className="map-geo-error">{geoError}</div>}
        </section>
      </div>
    </main>
  );
}
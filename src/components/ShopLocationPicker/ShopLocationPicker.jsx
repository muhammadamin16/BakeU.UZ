import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { MapPin, Search, LocateFixed } from "lucide-react";
import { translateText as t } from "../../i18n/index.js";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./ShopLocationPicker.css";

const defaultCenter = [41.3111, 69.2797];
const pin = L.divIcon({
  className: "bakeu-shop-location-pin",
  html: '<span aria-hidden="true">📍</span>',
  iconSize: [32, 40],
  iconAnchor: [16, 37],
});

function MoveMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo([coords.lat, coords.lng], 15, { duration: 0.5 });
  }, [map, coords?.lat, coords?.lng]);
  return null;
}
function PickOnClick({ onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng) });
  return null;
}

export default function ShopLocationPicker({ value, onChange, id = "shop-address" }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [coords, setCoords] = useState(() =>
    value.lat != null && value.lng != null &&
    Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)) &&
    value.lat !== "" && value.lng !== "" ? { lat: Number(value.lat), lng: Number(value.lng) } : null
  );

  async function lookup() {
    if (!value.address?.trim() || value.address.trim().length < 3) {
      setError(t("Введите адрес не короче трёх символов."));
      return;
    }
    setBusy(true); setError(""); setSuggestion(""); setSearchResult(null);
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", value.address.trim());
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("accept-language", "ru");
      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw Error(t("Поиск адреса временно недоступен."));
      const data = await response.json();
      if (!data.length) throw Error(t("Адрес не найден. Выберите место вручную на карте."));
      const found = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
      setCoords(found);
      setSearchResult(found);
      setSuggestion(data[0].display_name || "");
      setExpanded(true);
    } catch (cause) {
      setError(cause.message || t("Не удалось найти адрес."));
    } finally { setBusy(false); }
  }
  function confirmSearch() {
    if (!searchResult) return;
    onChange({ ...value, ...searchResult });
    setSearchResult(null);
    setSuggestion("");
  }
  function onMapClick(point) {
    const next = { lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) };
    setCoords(next);
    setSearchResult(null);
    setSuggestion("");
    onChange({ ...value, ...next });
    setError("");
  }
  function locate() {
    if (!navigator.geolocation) return setError(t("Геолокация не поддерживается."));
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { onMapClick({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setExpanded(true); setBusy(false); },
      () => { setError(t("Нет доступа к геолокации. Выберите точку на карте.")); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="bakeu-location-picker">
      <label className="bakeu-location-label" htmlFor={id}>{t("Адрес магазина")}</label>
      <div className="bakeu-location-input">
        <MapPin size={18} aria-hidden="true" />
        <input id={id} type="text" value={value.address || ""} required minLength={3} maxLength={250}
          autoComplete="street-address" placeholder={t("Город, район, улица, дом")}
          onChange={(e) => {
            onChange({ ...value, address: e.target.value, lat: null, lng: null });
            setCoords(null); setSearchResult(null); setSuggestion(""); setError("");
          }} />
      </div>
      <div className="bakeu-location-actions">
        <button type="button" onClick={lookup} disabled={busy}><Search size={16}/>{t("Найти на карте")}</button>
        <button type="button" onClick={() => setExpanded(s => !s)}><MapPin size={16}/>{t(expanded ? "Скрыть карту" : "Выбрать на карте")}</button>
        <button type="button" onClick={locate} disabled={busy}><LocateFixed size={16}/>{t("Моё местоположение")}</button>
      </div>
      {error && <p className="bakeu-location-error" role="alert">{error}</p>}
      {suggestion && <div className="bakeu-location-suggestion"><p>{suggestion}</p>
        <button type="button" onClick={confirmSearch}>{t("Подтвердить эту точку")}</button>
      </div>}
      {expanded && <div className="bakeu-location-map">
        <MapContainer center={coords ? [coords.lat, coords.lng] : defaultCenter} zoom={coords ? 15 : 11}
          scrollWheelZoom={false} className="bakeu-location-map-canvas">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MoveMap coords={coords}/>
          <PickOnClick onPick={onMapClick}/>
          {coords && <Marker position={[coords.lat, coords.lng]} icon={pin} />}
        </MapContainer>
        <p>{t("Нажмите на карту, чтобы выбрать точное место магазина. Адрес можно написать вручную выше.")}</p>
      </div>}
      {value.lat != null && value.lng != null && value.lat !== "" && value.lng !== "" &&
        <p className="bakeu-location-confirm">✓ {t("Точка выбрана")}: {Number(value.lat).toFixed(5)}, {Number(value.lng).toFixed(5)}</p>}
    </div>
  );
}

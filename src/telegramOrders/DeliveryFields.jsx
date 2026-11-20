import { useEffect, useId, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { validCoordinates } from "./domain.js";
import "./orders.css";
function MapClick({ onChange }) {
  useMapEvents({
    click: (event) =>
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
  });
  return null;
}
export default function DeliveryFields({
  value,
  onChange,
  pickupAvailable = true,
}) {
  const id = useId();
  const [map, setMap] = useState(false),
    [error, setError] = useState("");
  const latest = useRef({ value, onChange });
  const active = useRef(true);
  useEffect(() => {
    latest.current = { value, onChange };
  }, [value, onChange]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const update = (patch) => onChange({ ...value, ...patch });
  return (
    <fieldset className="tg-orders-delivery">
      <legend>Получение заказа</legend>
      <label htmlFor={id + "method"}>Способ получения</label>
      <select
        id={id + "method"}
        value={value.fulfillment || "delivery"}
        onChange={(e) =>
          update({
            fulfillment: e.target.value,
            ...(e.target.value === "pickup" ? { location: null } : {}),
          })
        }
      >
        <option value="delivery">Доставка по договорённости</option>
        {pickupAvailable && <option value="pickup">Самовывоз</option>}
      </select>
      {value.fulfillment !== "pickup" && (
        <>
          <label htmlFor={id + "address"}>Адрес</label>
          <textarea
            id={id + "address"}
            required
            maxLength={500}
            value={value.address || ""}
            onChange={(e) => update({ address: e.target.value })}
          />
          <button type="button" onClick={() => setMap((v) => !v)}>
            {map ? "Закрыть карту" : "Выбрать на карте"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              if (!navigator.geolocation) {
                setError("GPS недоступен. Введите адрес вручную.");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  if (
                    active.current &&
                    latest.current.value.fulfillment !== "pickup"
                  )
                    latest.current.onChange({
                      ...latest.current.value,
                      location: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                      },
                    });
                },
                () => {
                  if (active.current)
                    setError(
                      "Не удалось получить GPS. Адрес можно ввести вручную.",
                    );
                },
                {
                  enableHighAccuracy: false,
                  timeout: 10000,
                  maximumAge: 60000,
                },
              );
            }}
          >
            Использовать GPS
          </button>
          {map && (
            <MapContainer
              center={
                validCoordinates(value.location)
                  ? [value.location.latitude, value.location.longitude]
                  : [41.3111, 69.2797]
              }
              zoom={13}
              style={{ height: 300 }}
            >
              <TileLayer
                attribution="© OpenStreetMap"
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClick onChange={(location) => update({ location })} />
              {validCoordinates(value.location) && (
                <CircleMarker
                  center={[value.location.latitude, value.location.longitude]}
                />
              )}
            </MapContainer>
          )}
          {validCoordinates(value.location) && (
            <p>
              Точка выбрана.{" "}
              <button type="button" onClick={() => update({ location: null })}>
                Удалить координаты
              </button>
            </p>
          )}
        </>
      )}
      <label htmlFor={id + "date"}>Дата (Ташкент)</label>
      <input
        id={id + "date"}
        type="date"
        required
        value={value.date || ""}
        onChange={(e) => update({ date: e.target.value })}
      />
      <label htmlFor={id + "time"}>Время</label>
      <input
        id={id + "time"}
        type="time"
        required
        value={value.time || ""}
        onChange={(e) => update({ time: e.target.value })}
      />
      <label htmlFor={id + "comment"}>Комментарий</label>
      <textarea
        id={id + "comment"}
        maxLength={1000}
        value={value.comment || ""}
        onChange={(e) => update({ comment: e.target.value })}
      />
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}

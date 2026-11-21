import { statusLabels } from "./domain.js";
import "./orders.css";
const steps = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "delivering",
  "delivered",
  "completed",
];
export default function OrderProgress({ order }) {
  const status =
    order.status === "out_for_delivery" ? "delivering" : order.status;
  const path =
    order.fulfillment === "pickup"
      ? steps.filter((s) => !["delivering", "delivered"].includes(s))
      : steps;
  return (
    <section className="tg-orders-progress" aria-label="Статус заказа">
      <strong>{statusLabels[status] || status}</strong>
      <ol>
        {path.map((step) => (
          <li key={step} aria-current={step === status ? "step" : undefined}>
            {statusLabels[step]}
          </li>
        ))}
      </ol>
      {order.history?.length ? (
        <ul>
          {order.history.map((entry, index) => (
            <li key={index}>
              {statusLabels[entry.status] || entry.status} ·{" "}
              {new Date(entry.at).toLocaleString("ru-RU", {
                timeZone: "Asia/Tashkent",
              })}
            </li>
          ))}
        </ul>
      ) : (
        <p>История изменений ещё не предоставлена сервером.</p>
      )}
    </section>
  );
}

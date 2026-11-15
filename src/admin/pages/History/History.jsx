import { useSearchParams, Link } from "react-router-dom";
import { PageTitle } from "../../components/AdminUI";
import HistoryTimeline from "../../components/HistoryTimeline";
import { useAdminStore } from "../../store/adminStore";
import { collectionTitles, historyFor } from "../../utils/management";

export default function History() {
  const state = useAdminStore();
  const [params, setParams] = useSearchParams();
  const scope = Object.fromEntries(
    [
      "sellerId",
      "customerId",
      "shopId",
      "productId",
      "orderId",
      "subscriptionId",
    ]
      .filter((key) => params.get(key))
      .map((key) => [key, params.get(key)]),
  );
  const events = historyFor(state, scope).filter(
    (entry) =>
      (!params.get("entity") || entry.entity === params.get("entity")) &&
      `${entry.action} ${entry.label} ${entry.actor} ${entry.entityId} ${entry.reason || ""}`
        .toLocaleLowerCase("ru-RU")
        .includes((params.get("q") || "").toLocaleLowerCase("ru-RU")),
  );
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageTitle title="История действий" />
      <section className="ad-panel">
        {Object.keys(scope).length > 0 && (
          <div className="ad-scope-banner">
            <span>Показана история выбранной записи</span>
            <Link className="ad-btn small" to="/admin/history">
              Вся история
            </Link>
          </div>
        )}
        <div className="ad-toolbar">
          <div className="ad-input-search">
            <input
              aria-label="Поиск по истории"
              placeholder="Действие, имя или ID…"
              value={params.get("q") || ""}
              onChange={(event) => update("q", event.target.value)}
            />
          </div>
          <select
            aria-label="Раздел истории"
            value={params.get("entity") || ""}
            onChange={(event) => update("entity", event.target.value)}
          >
            <option value="">Все разделы</option>
            {Object.entries(collectionTitles).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="ad-muted">Записей: {events.length}</span>
        </div>
        <HistoryTimeline events={events} state={state} />
      </section>
    </>
  );
}

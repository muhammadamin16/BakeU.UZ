import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Clock3 } from "lucide-react";

export default function HistoryTimeline({
  events,
  state,
  empty = "Действий пока нет. История записывается с этого обновления.",
}) {
  return (
    <div className="ad-history-timeline">
      {events.map((entry) => {
        const exists =
          Array.isArray(state[entry.entity]) &&
          state[entry.entity].some((row) => row.id === entry.entityId);
        const detail = [
          "customers",
          "sellers",
          "shops",
          "products",
          "orders",
          "subscriptions",
        ].includes(entry.entity);
        const target =
          entry.entity === "settings"
            ? "/admin/settings"
            : detail
              ? `/admin/${entry.entity}/${encodeURIComponent(entry.entityId)}`
              : `/admin/${entry.entity}?q=${encodeURIComponent(entry.entityId)}`;
        return (
          <details className="ad-history-event" key={entry.id}>
            <summary>
              <span className="ad-history-dot">
                <Clock3 size={16} />
              </span>
              <span>
                <strong>{entry.action}</strong>
                <small>
                  {entry.label} · {entry.actor || "Администратор"}
                </small>
              </span>
              <time dateTime={entry.at}>
                {new Date(entry.at).toLocaleString("ru-RU", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
            </summary>
            <div className="ad-history-content">
              {entry.reason && (
                <p>
                  <strong>Причина:</strong> {entry.reason}
                </p>
              )}
              {entry.changes?.length > 0 && (
                <dl>
                  {entry.changes.map((change, index) => (
                    <div key={`${change.field}-${index}`}>
                      <dt>{change.field}</dt>
                      <dd>
                        <span>{change.before}</span>
                        <span aria-hidden="true">→</span>
                        <strong>{change.after}</strong>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {(exists || entry.entity === "settings") && (
                <Link className="ad-text-link" to={target}>
                  Открыть запись{" "}
                  <ArrowUpRight
                    size={12}
                    className="ad-inline-arrow"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
          </details>
        );
      })}
      {!events.length && <p className="ad-empty">{empty}</p>}
    </div>
  );
}

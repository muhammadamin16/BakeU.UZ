import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAdminStore } from "../../store/adminStore";
import { PageTitle } from "../../components/AdminUI";
import "./Notifications.css";
export default function Notifications() {
  const notifications = useAdminStore((s) => s.notifications);
  const markRead = useAdminStore((s) => s.markRead);
  const [error, setError] = useState("");
  const read = (id) => {
    try {
      markRead(id);
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  };
  const [params, setParams] = useSearchParams();
  const unread = params.get("unread") === "1";
  const q = (params.get("q") || "").toLowerCase();
  const rows = notifications.filter(
    (x) =>
      (!unread || !x.read) &&
      (x.title + " " + x.text).toLowerCase().includes(q),
  );
  return (
    <>
      <PageTitle title="Уведомления">
        <button className="ad-btn primary" onClick={() => read()}>
          <CheckCheck size={17} />
          Прочитать все
        </button>
      </PageTitle>
      {error && (
        <p role="alert" className="ad-form-error">
          {error}
        </p>
      )}
      <section className="ad-panel">
        <label className="ad-check">
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.checked) next.set("unread", "1");
              else next.delete("unread");
              setParams(next);
            }}
          />
          Только непрочитанные
        </label>
        {rows.map((n) => (
          <div className={`ad-notice ${n.read ? "read" : ""}`} key={n.id}>
            <span className="ad-notice-icon">
              <Bell size={21} />
            </span>
            <div>
              <strong>{n.title}</strong>
              <p>{n.text}</p>
              <small>{n.time}</small>
            </div>
            <button
              className="ad-btn small"
              disabled={n.read}
              onClick={() => read(n.id)}
            >
              {n.read ? "Прочитано" : "Прочитать"}
            </button>
          </div>
        ))}
        {!rows.length && <p className="ad-empty">Уведомлений нет</p>}
      </section>
    </>
  );
}

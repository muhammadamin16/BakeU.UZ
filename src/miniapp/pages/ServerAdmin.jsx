import { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Users,
  Store,
  ClipboardList,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { miniRequest } from "../api";
import { PageTitle, Badge } from "../../admin/components/AdminUI";
const tabs = [
  ["customers", "Покупатели"],
  ["sellers", "Продавцы"],
  ["applications", "Заявки магазинов"],
];
export default function ServerAdmin() {
  const [tab, setTab] = useState("customers");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ rows: [], stats: {}, hasNext: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [rejecting, setRejecting] = useState("");
  const [reason, setReason] = useState("");
  const requestTracker = useRef({ id: 0 });
  const load = useCallback(async () => {
    const tracker = requestTracker.current;
    const id = ++tracker.id;
    setLoading(true);
    setError("");
    setData((previous) => ({ ...previous, rows: [] }));
    try {
      const [list, overview] = await Promise.all([
        miniRequest(`/admin/${tab}?page=${page}`),
        miniRequest("/admin/overview"),
      ]);
      if (id === tracker.id) setData({ ...list, stats: overview.stats });
    } catch (failure) {
      if (id === tracker.id) setError(failure.message);
    } finally {
      if (id === tracker.id) setLoading(false);
    }
  }, [tab, page]);
  useEffect(() => {
    let active = true;
    const tracker = requestTracker.current;
    void Promise.resolve().then(() => {
      if (active) return load();
    });
    return () => {
      active = false;
      tracker.id++;
    };
  }, [load]);
  async function decide(id, status) {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      await miniRequest(`/admin/applications/${id}/decision`, {
        method: "POST",
        body: { status, reason },
      });
      setRejecting("");
      setReason("");
      await load();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageTitle title="Аккаунты и заявки">
        <button className="ad-btn" onClick={load} disabled={loading}>
          <RefreshCw size={16} />
          Обновить
        </button>
      </PageTitle>
      <p className="mini-server-status">
        <ShieldCheck size={14} /> Серверные регистрации сайта и заявки Telegram
      </p>
      <div className="mini-server-stats">
        {[
          [Users, "Покупатели", data.stats.customers],
          [Store, "Продавцы", data.stats.sellers],
          [ClipboardList, "На проверке", data.stats.pending],
          [ShieldCheck, "Одобрено", data.stats.approved],
        ].map(([Icon, label, value]) => (
          <div key={label}>
            <Icon size={20} />
            <small> {label}</small>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <div className="mini-server-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={`ad-btn ${tab === key ? "active" : ""}`}
            onClick={() => {
              setLoading(true);
              setTab(key);
              setPage(0);
              setRejecting("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="ad-form-error" role="alert">
          {error}
        </p>
      )}
      <section className="ad-panel" aria-busy={loading}>
        {loading ? (
          <p className="ad-empty">
            <LoaderCircle className="mini-spin" size={20} /> Загрузка…
          </p>
        ) : data.rows.length ? (
          data.rows.map((row) => (
            <article className="mini-server-row" key={row.id}>
              <div>
                <h3>
                  {tab === "applications"
                    ? row.shop
                    : [row.firstName, row.lastName].filter(Boolean).join(" ")}
                </h3>
                {tab === "applications" ? (
                  <>
                    <p>
                      {row.owner} · {row.address}
                    </p>
                    <Badge>{row.status}</Badge>
                    {row.reason && <p>Причина: {row.reason}</p>}
                  </>
                ) : (
                  <>
                    <p>{row.email}</p>
                    <p>
                      {row.phone}
                      {row.company ? ` · ${row.company}` : ""}
                    </p>
                  </>
                )}
                <small>
                  {new Date(row.createdAt).toLocaleString("ru-RU", {
                    timeZone: "Asia/Tashkent",
                  })}{" "}
                  · Ташкент
                </small>
              </div>
              {tab === "applications" && row.status === "На проверке" && (
                <div>
                  {rejecting === row.id ? (
                    <form
                      className="mini-server-reject"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void decide(row.id, "Отклонено");
                      }}
                    >
                      <label htmlFor="mini-reject-reason">Причина отказа</label>
                      <textarea
                        id="mini-reject-reason"
                        required
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="ad-row-actions">
                        <button
                          className="ad-btn small red"
                          disabled={Boolean(busy)}
                        >
                          Отклонить
                        </button>
                        <button
                          type="button"
                          className="ad-btn small"
                          onClick={() => setRejecting("")}
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="ad-row-actions">
                      <button
                        className="ad-btn small green"
                        disabled={Boolean(busy)}
                        onClick={() => decide(row.id, "Одобрено")}
                      >
                        ✓ Одобрить
                      </button>
                      <button
                        className="ad-btn small red"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          setRejecting(row.id);
                          setReason("");
                        }}
                      >
                        ✕ Отклонить
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="ad-empty">Записей пока нет</p>
        )}
      </section>
      <div className="ad-row-actions">
        <button
          className="ad-btn"
          disabled={page === 0 || loading}
          onClick={() => {
            setLoading(true);
            setPage((p) => p - 1);
          }}
        >
          ← Назад
        </button>
        <span className="ad-muted">Страница {page + 1}</span>
        <button
          className="ad-btn"
          disabled={!data.hasNext || loading}
          onClick={() => {
            setLoading(true);
            setPage((p) => p + 1);
          }}
        >
          Далее →
        </button>
      </div>
    </>
  );
}

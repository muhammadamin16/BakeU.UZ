import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
export function Badge({ children }) {
  const text = String(children);
  const tone = /Актив|Одобр|Открыт|Опубликован|Доставлен/.test(text)
    ? "green"
    : /Отклон|Истек|Заблок|Скрыт|Отмен/.test(text)
      ? "red"
      : "orange";
  return <span className={`ad-badge ${tone}`}>{children}</span>;
}
export function PageTitle({ title, children }) {
  return (
    <div className="ad-page-title">
      <h1>{title}</h1>
      {children}
    </div>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const panel = ref.current;
    panel?.querySelector("input,select,button")?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = Array.from(
          panel.querySelectorAll("button,input,select,a[href],textarea"),
        ).filter((x) => !x.disabled);
        const first = nodes[0];
        const last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="ad-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="ad-section-heading">
          <h2>{title}</h2>
          <button className="ad-icon" onClick={onClose} aria-label="Закрыть">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function RecordForm({ fields, initial = {}, onSave, onClose }) {
  const [values, setValues] = useState(initial);
  return (
    <form
      className="ad-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(values);
      }}
    >
      {fields.map((f) => (
        <label key={f.key}>
          {f.label}
          {f.options ? (
            <select
              required
              value={values[f.key] || ""}
              onChange={(e) =>
                setValues({ ...values, [f.key]: e.target.value })
              }
            >
              <option value="" disabled>
                Выберите
              </option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus={f === fields[0]}
              required={f.required !== false}
              type={f.type || "text"}
              min={f.type === "number" ? 0 : undefined}
              value={values[f.key] ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  [f.key]:
                    f.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          )}
        </label>
      ))}
      <div className="ad-form-actions">
        <button type="button" className="ad-btn" onClick={onClose}>
          Отмена
        </button>
        <button className="ad-btn primary">Сохранить</button>
      </div>
    </form>
  );
}
export function CollectionPage({
  title,
  collection,
  fields,
  columns,
  renderActions,
  detailsLink,
  addLabel = "Добавить",
}) {
  const rows = useAdminStore((s) => s[collection]);
  const save = useAdminStore((s) => s.save);
  const remove = useAdminStore((s) => s.remove);
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("Все");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const statuses = [...new Set(rows.map((x) => x.status))];
  const q = (params.get("q") || "").toLowerCase();
  const filtered = rows.filter(
    (x) =>
      (filter === "Все" || x.status === filter) &&
      Object.values(x).some((v) => String(v).toLowerCase().includes(q)),
  );
  return (
    <>
      <PageTitle title={title}>
        <button className="ad-btn primary" onClick={() => setEditing({})}>
          <Plus size={17} />
          {addLabel}
        </button>
      </PageTitle>
      <section className="ad-panel">
        <div className="ad-toolbar">
          <div className="ad-input-search">
            <Search size={17} />
            <input
              aria-label="Поиск"
              placeholder="Поиск по имени или ID…"
              value={params.get("q") || ""}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.value) next.set("q", e.target.value);
                else next.delete("q");
                setParams(next, { replace: true });
              }}
            />
          </div>
          <select
            aria-label="Фильтр статуса"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>Все</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="ad-muted">Найдено: {filtered.length}</span>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? (
                        c.render(row)
                      ) : c.key === "status" ? (
                        <Badge>{row[c.key]}</Badge>
                      ) : (
                        row[c.key] || "—"
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="ad-row-actions">
                      {detailsLink?.(row)}
                      {renderActions?.(row)}
                      <button
                        className="ad-icon"
                        onClick={() => setEditing(row)}
                        aria-label={`Редактировать ${row.name || row.id}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="ad-icon danger"
                        onClick={() => setDeleting(row)}
                        aria-label={`Удалить ${row.name || row.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="ad-empty">Ничего не найдено</div>
          )}
        </div>
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Редактировать запись" : "Новая запись"}
          onClose={() => setEditing(null)}
        >
          <RecordForm
            key={editing.id || "new"}
            fields={fields}
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={(item) => {
              save(
                collection,
                collection === "applications"
                  ? { ...item, status: editing.status || "На проверке" }
                  : item,
              );
              setEditing(null);
            }}
          />
        </Modal>
      )}
      {deleting && (
        <Modal title="Удалить запись?" onClose={() => setDeleting(null)}>
          <p>Запись «{deleting.name || deleting.id}» будет удалена.</p>
          <div className="ad-form-actions">
            <button className="ad-btn" onClick={() => setDeleting(null)}>
              Отмена
            </button>
            <button
              className="ad-btn red"
              onClick={() => {
                remove(collection, deleting.id);
                setDeleting(null);
              }}
            >
              Удалить
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

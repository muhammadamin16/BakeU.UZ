import { translateText } from "../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import {
  deleteRestriction,
  matchesSearch,
  scopeRecords,
} from "../utils/management";
import ImageField from "./ImageField";
import OrderItemsField from "./OrderItemsField";
export function Badge({ children }) {
  const text = String(children);
  const tone = /Заморож|Приостанов/.test(text)
    ? "blue"
    : /Актив|Одобр|Открыт|Опубликован|Доставлен/.test(text)
      ? "green"
      : /Отклон|Истек|Заблок|Скрыт|Отмен/.test(text)
        ? "red"
        : "orange";
  return <span className={`ad-badge ${tone}`}>{children}</span>;
}
export function PageTitle({ title, children }) {
  return (
    <div className="ad-page-title">
      <h1>{translateText(title)}</h1>
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
  return createPortal(
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
        aria-label={translateText(title)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="ad-section-heading">
          <h2>{translateText(title)}</h2>
          <button
            className="ad-icon"
            onClick={onClose}
            aria-label={translateText("Закрыть")}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.querySelector(".ad-app") || document.body,
  );
}
export function RecordForm({ fields, initial = {}, onSave, onClose }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const update = (key, value) => {
    setError("");
    setValues((previous) => {
      const next = { ...previous, [key]: value };
      if (
        key === "shopId" &&
        previous.shopId !== value &&
        Array.isArray(previous.items)
      ) {
        next.items = [];
        next.total = 0;
      }
      if (key === "items")
        next.total = value.reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
          0,
        );
      return next;
    });
  };
  return (
    <form
      className="ad-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setError("");
        setBusy(true);
        try {
          await onSave(values);
        } catch (failure) {
          setError(failure.message || "Не удалось сохранить запись");
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((field) => {
        const id = `${formId}-${field.key}`;
        const common = {
          id,
          "aria-label": field.label,
          "aria-describedby": field.hint ? `${id}-hint` : undefined,
          disabled: field.disabled || busy,
        };
        return (
          <div className="ad-form-field" key={field.key}>
            <label htmlFor={id}>{translateText(field.label)}</label>
            {field.type === "image" ? (
              <ImageField
                id={id}
                label={translateText(field.label)}
                disabled={field.disabled || busy}
                value={values[field.key]}
                onChange={(value) => update(field.key, value)}
                onBusy={setBusy}
              />
            ) : field.type === "orderItems" ? (
              <OrderItemsField
                id={id}
                products={field.products}
                shopId={values.shopId}
                value={values.items}
                disabled={field.disabled || busy}
                onChange={(value) => update(field.key, value)}
              />
            ) : field.options ? (
              <select
                {...common}
                required={field.required !== false}
                value={values[field.key] || ""}
                onChange={(event) => update(field.key, event.target.value)}
              >
                <option value="" disabled={field.required !== false}>
                  {translateText("Выберите")}
                </option>
                {field.options.map((option) => {
                  const value =
                    typeof option === "string" ? option : option.value;
                  return (
                    <option key={value} value={value}>
                      {translateText(
                        typeof option === "string" ? option : option.label,
                      )}
                    </option>
                  );
                })}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                {...common}
                rows={3}
                maxLength={4000}
                required={field.required !== false}
                value={values[field.key] || ""}
                onChange={(event) => update(field.key, event.target.value)}
              />
            ) : (
              <input
                {...common}
                required={field.required !== false}
                type={field.type || "text"}
                min={field.type === "number" ? 0 : undefined}
                readOnly={field.readOnly?.(values)}
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  update(
                    field.key,
                    field.type === "number" && event.target.value !== ""
                      ? Number(event.target.value)
                      : event.target.value,
                  )
                }
              />
            )}
            {field.hint && (
              <small id={`${id}-hint`} className="ad-field-hint">
                {translateText(field.hint)}
              </small>
            )}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="ad-form-error">
          {translateText(error)}
        </p>
      )}
      <div className="ad-form-actions">
        <button type="button" className="ad-btn" onClick={onClose}>
          {translateText("Отмена")}
        </button>
        <button className="ad-btn primary" disabled={busy}>
          {translateText(busy ? "Сохранение…" : "Сохранить")}
        </button>
      </div>
    </form>
  );
}

export function ConfirmAction({
  title,
  description,
  requireReason = false,
  confirmLabel = "Подтвердить",
  onConfirm,
  onClose,
  children,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={translateText(title)} onClose={onClose}>
      <form
        className="ad-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await onConfirm(reason.trim());
            onClose();
          } catch (failure) {
            setError(failure.message || "Действие не выполнено");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>{translateText(description)}</p>
        {children}
        {requireReason && (
          <label>
            {translateText("Причина")}
            <textarea
              aria-label={translateText("Причина")}
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="ad-form-error">
            {translateText(error)}
          </p>
        )}
        <div className="ad-form-actions">
          <button type="button" className="ad-btn" onClick={onClose}>
            {translateText("Отмена")}
          </button>
          <button className="ad-btn primary" disabled={busy}>
            {translateText(busy ? "Сохранение…" : confirmLabel)}
          </button>
        </div>
      </form>
    </Modal>
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
  canDelete = () => true,
  defaultValues = {},
  addDisabled = "",
}) {
  const data = useAdminStore();
  const { save, remove } = data;
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const rows = scopeRecords(data, collection, params);
  const filter = params.get("status") || "Все";
  const statuses = [...new Set(rows.map((row) => row.status))];
  if (filter !== "Все" && !statuses.includes(filter)) statuses.push(filter);
  const filtered = rows.filter(
    (row) =>
      (filter === "Все" || row.status === filter) &&
      (matchesSearch(row, params.get("q") || "") ||
        matchesSearch(
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              translateText(value),
            ]),
          ),
          params.get("q") || "",
        )),
  );
  const scopes = [
    ["sellerId", "Продавец", "sellers"],
    ["customerId", "Покупатель", "customers"],
    ["shopId", "Магазин", "shops"],
  ].filter(([key]) => params.get(key));
  const startAdding = () => {
    const initial =
      typeof defaultValues === "function"
        ? defaultValues()
        : { ...defaultValues };
    for (const [key] of scopes) initial[key] = params.get(key);
    if (!initial.shopId && initial.sellerId) {
      const shops = data.shops.filter(
        (row) => row.sellerId === initial.sellerId,
      );
      if (shops.length === 1) initial.shopId = shops[0].id;
    }
    setEditing(initial);
  };
  const deletionBlock = (row) =>
    deleteRestriction(data, collection, row) ||
    (!canDelete(row) ? "У записи есть связанные данные" : "");
  return (
    <>
      <PageTitle title={translateText(title)}>
        <button
          className="ad-btn primary"
          disabled={Boolean(addDisabled)}
          title={translateText(addDisabled || undefined)}
          onClick={startAdding}
        >
          <Plus size={17} />
          {translateText(addLabel)}
        </button>
      </PageTitle>
      {addDisabled && (
        <p className="ad-page-description">{translateText(addDisabled)}</p>
      )}
      <section className="ad-panel">
        {scopes.length > 0 && (
          <div className="ad-scope-banner">
            <div>
              {scopes.map(([key, label, entity]) => (
                <Link
                  key={key}
                  className="ad-btn small"
                  to={`/admin/${entity}/${encodeURIComponent(params.get(key))}`}
                >
                  {translateText(label)}:{" "}
                  {translateText(
                    data[entity].find((row) => row.id === params.get(key))
                      ?.name || params.get(key),
                  )}{" "}
                  <ArrowUpRight
                    size={12}
                    className="ad-inline-arrow"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
            <button
              className="ad-btn small"
              onClick={() => {
                const next = new URLSearchParams(params);
                scopes.forEach(([key]) => next.delete(key));
                setParams(next);
              }}
            >
              {translateText("Показать все")}
            </button>
          </div>
        )}
        <div className="ad-toolbar">
          <div className="ad-input-search">
            <Search size={17} />
            <input
              aria-label={translateText("Поиск")}
              placeholder={translateText("Поиск по имени или ID…")}
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
            aria-label={translateText("Фильтр статуса")}
            value={filter}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value === "Все") next.delete("status");
              else next.set("status", event.target.value);
              setParams(next);
            }}
          >
            <option value={"Все"}>{translateText("Все")}</option>
            {statuses.map((s) => (
              <option value={s} key={s}>
                {translateText(s)}
              </option>
            ))}
          </select>
          <span className="ad-muted">
            {translateText("Найдено: ")}
            {filtered.length}
          </span>
        </div>
        <div
          className="ad-table-wrap"
          tabIndex={0}
          role="region"
          aria-label={translateText(`Таблица: ${title}`)}
        >
          <table className="ad-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{translateText(c.label)}</th>
                ))}
                <th>{translateText("Действия")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? (
                        translateText(c.render(row))
                      ) : c.key === "status" ? (
                        <Badge>{translateText(row[c.key])}</Badge>
                      ) : (
                        translateText(row[c.key] || "—")
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="ad-row-actions">
                      {translateText(detailsLink?.(row))}
                      {translateText(renderActions?.(row))}
                      <button
                        className="ad-icon"
                        onClick={() => setEditing(row)}
                        aria-label={translateText(
                          `Редактировать ${row.name || row.id}`,
                        )}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="ad-icon danger"
                        disabled={Boolean(deletionBlock(row))}
                        title={translateText(deletionBlock(row) || undefined)}
                        onClick={() => {
                          setDeleteError("");
                          setDeleting(row);
                        }}
                        aria-label={translateText(
                          `Удалить ${row.name || row.id}`,
                        )}
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
            <div className="ad-empty">{translateText("Ничего не найдено")}</div>
          )}
        </div>
      </section>
      {editing && (
        <Modal
          title={translateText(
            editing.id ? "Редактировать запись" : "Новая запись",
          )}
          onClose={() => setEditing(null)}
        >
          <RecordForm
            key={editing.id || "new"}
            fields={typeof fields === "function" ? fields(editing) : fields}
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
        <Modal
          title={translateText("Удалить запись?")}
          onClose={() => setDeleting(null)}
        >
          <p>
            {translateText("Запись «")}
            {translateText(deleting.name || deleting.id)}
            {translateText("» будет удалена. Действие останется в истории")}
          </p>
          {deleteError && (
            <p role="alert" className="ad-form-error">
              {translateText(deleteError)}
            </p>
          )}
          <div className="ad-form-actions">
            <button className="ad-btn" onClick={() => setDeleting(null)}>
              {translateText("Отмена")}
            </button>
            <button
              className="ad-btn red"
              onClick={() => {
                try {
                  remove(collection, deleting.id);
                  setDeleting(null);
                } catch (failure) {
                  setDeleteError(failure.message || "Удаление не выполнено");
                }
              }}
            >
              {translateText("Удалить")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { translateText as t } from "../i18n/index.js";
const labels = { draft: "Черновик", pending: "На проверке", approved: "Открыт", rejected: "Отклонён", suspended: "Приостановлен" };

export default function MarketModeration({ transport }) {
  const [state, setState] = useState({ items: [], next: "", error: "" }), [busy, setBusy] = useState(false), [reason, setReason] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    transport.request("/admin/markets", { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setState({ ...data, error: "" }); }).catch((error) => { if (!controller.signal.aborted) setState({ items: [], next: "", error: error.message }); });
    return () => controller.abort();
  }, [transport]);
  async function moderate(market, status) {
    if (busy) return;
    if (reason.trim().length < 2) return setState((old) => ({ ...old, error: t("Укажите причину изменения.") }));
    setBusy(true);
    try {
      const changed = await transport.request(`/admin/markets/${encodeURIComponent(market.id)}/status`, { method: "PATCH", body: { expectedStatus: market.status, status, reason } });
      setState((old) => ({ ...old, items: old.items.map((item) => item.id === changed.id ? changed : item), error: "" })); setReason("");
    } catch (error) { setState((old) => ({ ...old, error: error.message })); }
    finally { setBusy(false); }
  }
  return <section className="tg-orders-panel"><h2>{t("Модерация магазинов")}</h2>
    <label>{t("Причина изменения")}<textarea maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    {state.error && <p role="alert">{state.error}</p>}
    {state.items.map((market) => <article key={market.id}><h3>{market.name}</h3><p>{t(labels[market.status] || "Статус недоступен")}</p><p>{market.address}</p>
      {market.status === "approved" && <button disabled={busy} onClick={() => moderate(market, "suspended")}>{t("Приостановить магазин")}</button>}
      {market.status === "suspended" && <button disabled={busy} onClick={() => moderate(market, "approved")}>{t("Возобновить магазин")}</button>}
      {market.status === "pending" && <><button disabled={busy} onClick={() => moderate(market, "approved")}>{t("Одобрить")}</button><button disabled={busy} onClick={() => moderate(market, "rejected")}>{t("Отклонить")}</button></>}
    </article>)}
    {state.next && <button disabled={busy} onClick={async () => {
      setBusy(true); try { const data = await transport.request("/admin/markets?after=" + encodeURIComponent(state.next)); setState((old) => ({ items: [...old.items, ...data.items], next: data.next, error: "" })); }
      catch (error) { setState((old) => ({ ...old, error: error.message })); } finally { setBusy(false); }
    }}>{t("Показать ещё")}</button>}
  </section>;
}

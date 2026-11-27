import { useEffect, useState } from "react";
import { goPhoneAccountsEnabled } from "../api/goAccount.js";
import { translateText as t } from "../i18n/index.js";
import OrderProgress from "./OrderProgress";
import { nextStatuses, statusLabels } from "./domain.js";
function OrdersSession({ client, sessionKey, transitionsEnabled = false, orderId = "" }) {
  const [state, setState] = useState({
    loading: true,
    orders: [],
    user: null,
    error: "",
  });
  const [busy, setBusy] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true,
      timer;
    const controller = new AbortController();
    async function load() {
      try {
        if (!client || !sessionKey)
          throw new Error("Войдите в аккаунт через общий Backend.");
        const result = await client.load(controller.signal);
        if (active) setState({ loading: false, ...result, error: "" });
      } catch (error) {
        if (active)
          setState({
            loading: false,
            orders: [],
            user: null,
            error: error.message || "Не удалось загрузить заказы.",
          });
      }
      if (active) timer = setTimeout(load, 5000);
    }
    load();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [client, sessionKey, revision]);
  // Session-specific subtree prevents showing an earlier user's data while a
  // new account's first request is pending. Mount this panel with key=sessionKey.
  const visibleOrders = orderId ? state.orders.filter((order) => order.id === orderId) : state.orders;
  return (
    <section className="tg-orders-panel" aria-label="Серверные заказы">
      {state.loading && <p role="status">Загрузка заказов…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {!state.loading && !state.error && !visibleOrders.length && (
        <p>{orderId ? "Заказ не найден." : "📭 Пока нет заказов."}</p>
      )}
      {visibleOrders.map((order) => (
        <article key={order.id}>
          <h3>Заказ #{order.number || order.id}</h3>
          <p>{order.shopName || "Магазин"}</p>
          <p>{Number(order.total).toLocaleString("ru-RU")} сум</p>
          <ul>
            {order.items.map((item, index) => (
              <li key={item.productId ? item.productId + ":" + (item.variantId || "") : index}>
                {item.title}{item.variantName ? ` (${item.variantName})` : ""} × {item.qty} —{" "}
                {(item.price * item.qty).toLocaleString("ru-RU")} сум
              </li>
            ))}
          </ul>
          <p>{order.address || order.deliveryAddress}</p>
          {order.scheduledAt && (
            <p>
              {new Date(order.scheduledAt).toLocaleString("ru-RU", {
                timeZone: "Asia/Tashkent",
              })}
            </p>
          )}
          <OrderProgress order={order} />
          {goPhoneAccountsEnabled && state.audience === "buyer" && <ComplaintForm client={client} orderId={order.id} />}
          {transitionsEnabled &&
            order.workflowVersion >= 2 &&
            state.user?.role === "seller" &&
            state.audience !== "buyer" && order.sellerId === state.user.uid &&
            nextStatuses(order.status, order.fulfillment).map((status) => (
              <button
                key={status}
                disabled={Boolean(busy)}
                onClick={async () => {
                  setBusy(order.id);
                  try {
                    await client.transition(order, status, crypto.randomUUID());
                    setRevision((v) => v + 1);
                  } catch (error) {
                    setState((v) => ({
                      ...v,
                      error: error.message || "Статус не изменён.",
                    }));
                  } finally {
                    setBusy("");
                  }
                }}
              >
                {statusLabels[status]}
              </button>
            ))}
        </article>
      ))}
    </section>
  );
}

export default function ServerOrdersPanel(props) {
  return <OrdersSession key={props.sessionKey || "signed-out"} {...props} />;
}

function ComplaintForm({ client, orderId }) {
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return <details>
    <summary>{t("Подать жалобу")}</summary>
    <form onSubmit={async event => {
      event.preventDefault();
      setBusy(true);
      try {
        await client.complain(orderId, subject);
        setSubject("");
        setStatus("Жалоба отправлена.");
      } catch (failure) { setStatus(failure.message); }
      finally { setBusy(false); }
    }}>
      <label>{t("Жалоба")}<textarea required minLength={5} maxLength={500} value={subject} onChange={event => setSubject(event.target.value)} /></label>
      <button disabled={busy}>{t("Отправить")}</button>
      {status && <p role="status">{t(status)}</p>}
    </form>
  </details>;
}

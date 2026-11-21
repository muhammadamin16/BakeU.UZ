import { useEffect, useState } from "react";
function Inbox({ client }) {
  const [state, setState] = useState({ items: [], error: "" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    client
      .notifications(controller.signal)
      .then((items) => {
        if (active) setState({ items, error: "" });
      })
      .catch(() => {
        if (active)
          setState({ items: [], error: "Уведомления временно недоступны." });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [client]);
  return (
    <section className="tg-orders-panel" aria-label="Уведомления">
      {state.error && <p role="alert">{state.error}</p>}
      {state.items.map((item) => (
        <article key={item.id}>
          <strong>{item.title}</strong>
          {["blocked", "failed", "uncertain", "unlinked"].includes(
            item.telegramState,
          ) && (
            <p>
              Сообщение сохранено здесь. Доставка в Telegram не подтверждена.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
export default function ServerNotifications({ client, sessionKey }) {
  return client && sessionKey ? (
    <Inbox key={sessionKey} client={client} />
  ) : null;
}

import { useEffect, useState } from "react";
import { translateText as t } from "../i18n/index.js";
function Inbox({ client }) {
  const [state, setState] = useState({ items: [], unread: 0, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    client
      .notifications(controller.signal)
      .then(({ items, unread }) => {
        if (active) setState({ items, unread, error: "" });
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
      {state.unread > 0 && <p>{t("Непрочитанные уведомления")}: {state.unread}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {state.items.map((item) => (
        <article key={item.id}>
          <strong>{item.title}</strong>
          {item.read === false && <button type="button" onClick={async () => {
            try {
              await client.readNotification(item.id);
              setState(current => ({
                ...current, unread: Math.max(0, current.unread - Number(current.items.some(value => value.id === item.id && !value.read))),
                items: current.items.map(value => value.id === item.id ? { ...value, read: true } : value),
              }));
            } catch (failure) { setState(current => ({ ...current, error: failure.message })); }
          }}>{t("Отметить прочитанным")}</button>}
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

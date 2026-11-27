import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { goAccount, goAPIBase } from "../../api/goAccount.js";
import { translateText as t } from "../../i18n/index.js";

const merge = (a, b) => [...new Map([...a, ...b].map(message => [message.id, message])).values()]
  .sort((a, b) => a.sequence - b.sequence);

export default function ServerChat() {
  const [params] = useSearchParams();
  const target = params.get("seller");
  const [user, setUser] = useState();
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const activeChat = useRef("");
  const reload = useRef(async () => {});
  const end = useRef();
  const me = user?.uid;

  useEffect(() => {
    const controller = new AbortController();
    const request = (path, options) => goAccount.requestWithOptions(path, { ...options, signal: controller.signal });
    let socket;
    const handleError = error => { if (!controller.signal.aborted) setError(error.message); };
    (async () => {
      const profile = await request("/me");
      if (controller.signal.aborted) return;
      setUser(profile);
      reload.current = async () => {
        const result = await request("/chats");
        if (!controller.signal.aborted) setThreads(result.items);
      };
      if (target) {
        const opened = await request("/chats", { method: "POST", body: { shopId: target } });
        if (!controller.signal.aborted) setSelected(opened.id);
      }
      await reload.current();
      if (controller.signal.aborted) return;
      const base = new URL(goAPIBase, location.origin);
      socket = io(base.origin, {
        path: base.pathname.replace(/\/$/, "") + "/chat/socket",
        transports: ["polling"],
        auth: callback => goAccount.socketToken().then(token => callback({ token })).catch(() => callback({})),
      });
      socket.on("connect", () => {
        reload.current().catch(handleError);
        const id = activeChat.current;
        if (id) request(`/chats/${id}/messages`).then(result => {
          if (activeChat.current === id) setMessages(current => merge(current, result.items));
        }).catch(handleError);
      });
      socket.on("chat:message", message => {
        if (message.chatId === activeChat.current) setMessages(items => merge(items, [message]));
        else reload.current().catch(handleError);
      });
    })().catch(failure => {
      if (controller.signal.aborted) return;
      if (failure.status === 401) setUser(null);
      else setError(failure.message);
    });
    return () => { controller.abort(); socket?.disconnect(); };
  }, [target]);

  useEffect(() => {
    activeChat.current = selected;
    if (!selected) return;
    const controller = new AbortController();
    goAccount.requestWithOptions(`/chats/${selected}/messages`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) {
        setMessages(current => merge(current, result.items));
        setCursor(result.next);
      }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => { controller.abort(); };
  }, [selected]);

  const through = messages.at(-1)?.sequence;
  useEffect(() => {
    if (!selected || through === undefined) return;
    goAccount.request(`/chats/${selected}/read`, "PUT", { through })
      .then(() => reload.current()).catch(error => setError(error.message));
    end.current?.scrollIntoView({ block: "nearest" });
  }, [selected, through]);

  async function send(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const message = await goAccount.request(`/chats/${selected}/messages`, "POST", { text });
      if (activeChat.current === selected) {
        setMessages(items => merge(items, [message]));
        setText("");
      }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function loadEarlier() {
    try {
      const result = await goAccount.request(`/chats/${selected}/messages?before=${encodeURIComponent(cursor)}`);
      if (activeChat.current === selected) {
        setMessages(current => merge(current, result.items));
        setCursor(result.next);
      }
    } catch (failure) { setError(failure.message); }
  }
  function select(id) {
    if (selected === id) return;
    activeChat.current = id;
    setSelected(id);
    setMessages([]);
    setCursor("");
    setText("");
  }

  if (user === null) return <Navigate to="/login" state={{ next: "/messages?" + params.toString() }} replace />;
  return <main className="bw-page">
    <h1>{t("Сообщения")}</h1>
    {params.get("checkout") === "1" && <Link className="bw-btn" to="/checkout">{t("Вернуться к оформлению")}</Link>}
    {error && <p role="alert">{t(error)}</p>}
    <section className={`bc-chat ${selected ? "has-conversation" : ""}`}>
      <aside className="bc-dialogs">
        {threads.map(thread => <button type="button" key={thread.id} className={`bc-dialog ${selected === thread.id ? "active" : ""}`}
          onClick={() => select(thread.id)}>
          <strong>{(thread.buyerId === me ? thread.shopName : thread.buyerName) || t("Диалог")}</strong>
          {!!thread.unread && <span>{thread.unread}</span>}
        </button>)}
      </aside>
      {selected && <section className="bc-conversation">
        <button type="button" className="bw-btn" onClick={() => select("")}>{t("Назад")}</button>
        <div className="bc-messages" role="log" aria-label={t("Сообщения")}>
          {cursor && <button type="button" onClick={loadEarlier}>{t("Загрузить предыдущие сообщения")}</button>}
          {messages.map(message => <p className={`bc-bubble ${message.senderId === me ? "mine" : ""}`} key={message.id}>
            {message.text}
          </p>)}
          <span ref={end} />
        </div>
        <form className="bc-compose" onSubmit={send}>
          <input aria-label={t("Сообщение")} maxLength={2000} value={text} onChange={event => setText(event.target.value)} />
          <button disabled={busy || !text.trim()}>{t("Отправить")}</button>
        </form>
      </section>}
    </section>
  </main>;
}

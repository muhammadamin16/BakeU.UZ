import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Send, Phone, MapPin, Store, MessageCircle, Check, CheckCheck,
} from "lucide-react";

import { shops, getShop, getMapLinks } from "../Seller/sellerData";
import { useChatMessages, sendMessage, markRead, getMessages } from "./chatStore";
import "./Chat.css";

// Демо: продавец биринчи хабарга автоматик жавоб беради. Ҳақиқий backend уланганда false қилинг
const DEMO_AUTOREPLY = true;
const AUTOREPLY_TEXT = "Здравствуйте! Спасибо за сообщение. Скоро отвечу вам.";

const readSession = (key, fallback) => {
  try {
    return sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const writeSession = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const formatTime = (at) =>
  new Date(at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export default function Chat() {
  const [params] = useSearchParams();
  const messages = useChatMessages();

  // Режим ҳар бир вкладкада алоҳида: бир вкладка — покупатель, иккинчиси — продавец
  const [role, setRole] = useState(() =>
    readSession("bakeu-chat-role", "buyer") === "seller" ? "seller" : "buyer"
  );
  const [myShopId, setMyShopId] = useState(() => {
    const id = readSession("bakeu-chat-shop", shops[0].id);
    return getShop(id) ? id : shops[0].id;
  });
  const [text, setText] = useState("");

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const isSeller = role === "seller";
  const paramShop = getShop(params.get("seller"));
  const activeId = isSeller ? myShopId : paramShop?.id ?? null;
  const activeShop = getShop(activeId);

  const conversations = useMemo(() => {
    const ids = new Set(messages.map((m) => m.shopId));
    if (paramShop) ids.add(paramShop.id);

    return [...ids]
      .map(getShop)
      .filter(Boolean)
      .map((shop) => {
        const thread = messages.filter((m) => m.shopId === shop.id);
        const last = thread[thread.length - 1];
        return {
          shop,
          last,
          unread: thread.filter((m) => m.from === "seller" && !m.read).length,
          order: last ? last.at : Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => b.order - a.order);
  }, [messages, paramShop]);

  const thread = useMemo(
    () => (activeId ? messages.filter((m) => m.shopId === activeId) : []),
    [messages, activeId]
  );

  const lastId = thread.length ? thread[thread.length - 1].id : null;

  // Очиқ диалогдаги келган хабарларни «ўқилди» деб белгилаш
  useEffect(() => {
    if (activeId) markRead({ shopId: activeId, reader: role });
  }, [activeId, role, lastId]);

  // Янги хабарда пастга тушиш (саҳифанинг ўзини сурмайди)
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeId, lastId]);

  const changeRole = (next) => {
    setRole(next);
    writeSession("bakeu-chat-role", next);
  };

  const changeShop = (id) => {
    setMyShopId(id);
    writeSession("bakeu-chat-shop", id);
  };

  const resizeInput = (el) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!activeId || !text.trim()) return;

    const shopId = activeId;
    const hadSellerReply = getMessages().some(
      (m) => m.shopId === shopId && m.from === "seller"
    );

    sendMessage({ shopId, from: role, text });
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    if (DEMO_AUTOREPLY && role === "buyer" && !hadSellerReply) {
      window.setTimeout(
        () => sendMessage({ shopId, from: "seller", text: AUTOREPLY_TEXT }),
        1500
      );
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const maps = activeShop ? getMapLinks(activeShop) : null;
  const hasThread = isSeller || Boolean(activeShop);

  return (
    <main className="chat-page">
      <header className="chat-top">
        <h1>Сообщения</h1>

        <div className="chat-role" role="group" aria-label="Режим демо">
          <button
            type="button"
            className={!isSeller ? "is-active" : ""}
            aria-pressed={!isSeller}
            onClick={() => changeRole("buyer")}
          >
            Я покупатель
          </button>
          <button
            type="button"
            className={isSeller ? "is-active" : ""}
            aria-pressed={isSeller}
            onClick={() => changeRole("seller")}
          >
            Я продавец
          </button>
        </div>
      </header>

      {isSeller && (
        <label className="chat-shopselect">
          <span>Мой магазин</span>
          <select value={myShopId} onChange={(e) => changeShop(e.target.value)}>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="chat-demo">
        Демо-чат: сообщения хранятся в этом браузере. Откройте вторую вкладку в режиме
        «Я продавец», чтобы проверить переписку.
      </p>

      <div
        className={`chat-shell${hasThread ? " has-thread" : ""}${
          isSeller ? " chat-shell--single" : ""
        }`}
      >
        {/* СПИСОК ДИАЛОГОВ */}
        <aside className="chat-list" aria-label="Диалоги">
          {conversations.length === 0 ? (
            <div className="chat-list__empty">
              <p>Пока нет диалогов. Откройте профиль продавца и нажмите «Написать в чат».</p>
              <Link to="/seller?tab=sellers" className="chat-link-btn">
                Все продавцы
              </Link>
            </div>
          ) : (
            conversations.map(({ shop, last, unread }) => (
              <Link
                key={shop.id}
                to={`/messages?seller=${shop.id}`}
                className={`chat-item${shop.id === activeId ? " is-active" : ""}`}
              >
                <span className="chat-avatar" style={{ background: shop.color }}>
                  {shop.initials}
                </span>
                <span className="chat-item__body">
                  <strong>{shop.name}</strong>
                  <small>{last ? last.text : "Новый диалог"}</small>
                </span>
                {unread > 0 && <span className="chat-badge">{unread}</span>}
              </Link>
            ))
          )}
        </aside>

        {/* ПЕРЕПИСКА */}
        <section className="chat-thread" aria-label="Переписка">
          {!activeShop ? (
            <div className="chat-placeholder">
              <MessageCircle size={34} aria-hidden="true" />
              <h2>Выберите диалог</h2>
              <p>Или откройте профиль продавца и нажмите «Написать в чат».</p>
              <Link to="/seller?tab=sellers" className="chat-link-btn">
                Все продавцы
              </Link>
            </div>
          ) : (
            <>
              <header className="chat-thread__head">
                {!isSeller && (
                  <Link to="/messages" className="chat-back" aria-label="Назад к диалогам">
                    <ArrowLeft size={20} aria-hidden="true" />
                  </Link>
                )}

                <span className="chat-avatar" style={{ background: activeShop.color }}>
                  {activeShop.initials}
                </span>

                <div className="chat-thread__who">
                  <strong>{isSeller ? "Покупатель" : activeShop.name}</strong>
                  <small>
                    {isSeller ? `Магазин: ${activeShop.name}` : activeShop.hours}
                  </small>
                </div>

                {!isSeller && (
                  <div className="chat-thread__actions">
                    <Link
                      to={`/seller?shop=${activeShop.id}`}
                      className="chat-icon-btn"
                      aria-label="Профиль магазина"
                    >
                      <Store size={18} aria-hidden="true" />
                    </Link>
                    <a
                      href={`tel:${activeShop.phone.replace(/[^\d+]/g, "")}`}
                      className="chat-icon-btn"
                      aria-label="Позвонить"
                    >
                      <Phone size={18} aria-hidden="true" />
                    </a>
                    <a
                      href={maps.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chat-icon-btn"
                      aria-label="Показать на карте"
                    >
                      <MapPin size={18} aria-hidden="true" />
                    </a>
                  </div>
                )}
              </header>

              <div className="chat-messages" ref={listRef} role="log" aria-live="polite">
                {thread.length === 0 ? (
                  <p className="chat-messages__empty">
                    Напишите первое сообщение. Например, уточните состав, цену или срок заказа.
                  </p>
                ) : (
                  thread.map((m) => {
                    const mine = m.from === role;
                    return (
                      <div key={m.id} className={`chat-msg${mine ? " is-me" : ""}`}>
                        <p>{m.text}</p>
                        <span className="chat-msg__meta">
                          {formatTime(m.at)}
                          {mine &&
                            (m.read ? (
                              <CheckCheck size={14} aria-label="Прочитано" />
                            ) : (
                              <Check size={14} aria-label="Отправлено" />
                            ))}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="chat-form" onSubmit={submit}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  maxLength={2000}
                  placeholder="Напишите сообщение…"
                  aria-label="Сообщение"
                  onChange={(e) => {
                    setText(e.target.value);
                    resizeInput(e.target);
                  }}
                  onKeyDown={onKeyDown}
                />
                <button
                  type="submit"
                  className="chat-send"
                  disabled={!text.trim()}
                  aria-label="Отправить"
                >
                  <Send size={19} aria-hidden="true" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
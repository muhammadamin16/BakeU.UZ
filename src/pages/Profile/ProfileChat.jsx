import { normalizeSearch } from "../../i18n/alphabet.js";
import { getLocale } from "../../i18n/index.js";
import { translateText } from "../../i18n/index.js";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Search,
  Send,
  MessageCircle,
  CheckCheck,
} from "lucide-react";
import {
  useWorkspace,
  startThread,
  postMessage,
  markThreadRead,
} from "../../store/workspaceStore";
import { accountId } from "../../store/localAccount";
import { useCatalog } from "../../store/sellerData";
export default function ProfileChat({ account, ownerId, initialShop }) {
  const threads = useWorkspace((s) => s.threads),
    { shops } = useCatalog();
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const end = useRef(null);
  const openedShop = useRef("");
  const seller = account.role === "seller";
  const mine = threads.filter((t) =>
    seller ? t.shopId === ownerId : t.buyerId === accountId(account),
  );
  const current = mine.find((t) => t.id === selected);
  useEffect(() => {
    const key = `${accountId(account)}:${initialShop || ""}`;
    if (seller || !initialShop || openedShop.current === key) return;
    // The external store persists the conversation before the view selects it.
    const timer = setTimeout(() => {
      if (!seller && initialShop) {
        const shop = shops.find((s) => s.id === initialShop);
        if (shop)
          try {
            setSelected(startThread(account, shop));
            openedShop.current = key;
          } catch {
            setError("Не удалось открыть чат");
          }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialShop, account, seller, shops]);
  useEffect(() => {
    if (current) markThreadRead(account, ownerId, current.id);
  }, [account, ownerId, current]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [selected, current?.messages.length]);
  function send(e) {
    e.preventDefault();
    try {
      postMessage(account, ownerId, selected, text);
      setText("");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section
      className={`bc-chat ${current ? "has-conversation" : ""}`}
      aria-label={translateText("Сообщения")}
    >
      <aside className="bc-dialogs">
        <h2>
          {translateText("Сообщения ")}
          <MessageCircle size={20} />
        </h2>
        <label className="bc-search">
          <Search size={16} />
          <input
            aria-label={translateText("Поиск диалога")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translateText("Найти диалог...")}
          />
        </label>
        {mine
          .filter((t) =>
            normalizeSearch(seller ? t.buyerName : t.shopName).includes(
              normalizeSearch(query),
            ),
          )
          .map((t) => (
            <button
              className={`bc-dialog ${t.id === selected ? "active" : ""}`}
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                setText("");
              }}
            >
              <span className="bc-avatar">
                {translateText((seller ? t.buyerName : t.shopName).slice(0, 2))}
              </span>
              <span>
                <strong>
                  {translateText(seller ? t.buyerName : t.shopName)}
                </strong>
                <small>
                  {translateText(t.messages.at(-1)?.text || "Начните разговор")}
                </small>
              </span>
              {t.messages.some(
                (m) => !m.read && m.from !== (seller ? "seller" : "buyer"),
              ) && <i />}
            </button>
          ))}
        {!seller && (
          <>
            <h3>{translateText("Написать магазину")}</h3>
            {shops
              .filter((s) =>
                normalizeSearch(s.name).includes(normalizeSearch(query)),
              )
              .map((shop) => (
                <button
                  key={shop.id}
                  className="bc-dialog"
                  onClick={() => {
                    try {
                      setSelected(startThread(account, shop));
                    } catch {
                      setError("Не удалось сохранить чат");
                    }
                  }}
                >
                  <span className="bc-avatar">
                    {translateText(shop.initials)}
                  </span>
                  <span>
                    <strong>{translateText(shop.name)}</strong>
                    <small>{translateText("Открыть диалог")}</small>
                  </span>
                </button>
              ))}
          </>
        )}
        {seller && !mine.length && (
          <p className="bc-empty">
            {translateText(
              "Новые диалоги появятся после сообщения покупателя.",
            )}
          </p>
        )}
      </aside>
      <div className="bc-conversation">
        {current ? (
          <>
            <header>
              <button
                className="bw-btn bc-back"
                onClick={() => setSelected("")}
                aria-label={translateText("К списку чатов")}
              >
                <ArrowLeft size={18} />
              </button>
              <span className="bc-avatar">
                {translateText(
                  (seller ? current.buyerName : current.shopName).slice(0, 2),
                )}
              </span>
              <div>
                <strong>
                  {translateText(seller ? current.buyerName : current.shopName)}
                </strong>
                <small>{translateText("Локальный чат BakeU")}</small>
              </div>
            </header>
            <div className="bc-messages" role="log" aria-live="polite">
              <p className="bc-note">
                {translateText(
                  "Демо: переписка доступна аккаунтам только в этом браузере. Доставка на другие устройства не подключена.",
                )}
              </p>
              {current.messages.map((m) => (
                <article
                  key={m.id}
                  className={`bc-bubble ${m.from === (seller ? "seller" : "buyer") ? "own" : ""}`}
                >
                  {m.from === "auto" && <b>{translateText("Автоответчик")}</b>}
                  <p>{m.from === "auto" ? translateText(m.text) : m.text}</p>
                  <small>
                    {translateText(
                      new Date(m.at).toLocaleTimeString(getLocale(), {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    )}
                    {m.read && m.from !== "auto" && <CheckCheck size={13} />}
                  </small>
                </article>
              ))}
              <span ref={end} />
            </div>
            <form onSubmit={send} className="bc-compose">
              <textarea
                aria-label={translateText("Сообщение")}
                placeholder={translateText("Написать сообщение...")}
                rows={1}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    send(e);
                  }
                }}
              />
              <button
                disabled={!text.trim()}
                aria-label={translateText("Отправить сообщение")}
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="bc-placeholder">
            <MessageCircle size={48} />
            <h2>{translateText("Ваши разговоры — здесь")}</h2>
            <p>{translateText("Выберите диалог, чтобы продолжить общение.")}</p>
          </div>
        )}
        {error && <p role="alert">{translateText(error)}</p>}
      </div>
    </section>
  );
}

import { normalizeSearch } from "../../i18n/alphabet.js";
import { getLocale, translateText } from "../../i18n/index.js";
import { useLanguage } from "../../i18n/useLanguage.js";
import { Link } from "react-router-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  ArrowUpRight,
  CakeSlice,
  Croissant,
  MapPin,
  History,
  MessageSquarePlus,
  ShieldCheck,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  createId,
  groupChats,
  loadChats,
  makeTitle,
  saveChats,
} from "../../store/aiHistory";
import "./AiAssistant.css";

const TOPICS = [
  { Icon: CakeSlice, title: "Торт на праздник", question: "Как выбрать торт на праздник?" },
  { Icon: Croissant, title: "Выпечка к ужину", question: "Где посмотреть самсу?" },
  { Icon: ShieldCheck, title: "Состав и аллергены", question: "Есть ли торт без орехов?" },
  { Icon: MapPin, title: "Мастера рядом", question: "Что вкусного рядом со мной?" },
];

function getReply(question) {
  const text = normalizeSearch(question);
  const map = /рядом|близко|yaqin|hudud|карта|xarita/.test(text);
  const allergen = /орех|аллерг|глютен|состав|yong|allerg|glyuten|tarkib/.test(text);
  const category = [
    [/торт|tort|праздник|bayram/, "торт"],
    [/самс|сомс|somsa|samsa/, "самса"],
    [/печень|pechen/, "Печенье"],
    [/хлеб|\bnon\b/, "Хлеб"],
  ].find(([pattern]) => pattern.test(text))?.[1];

  if (allergen) {
    return {
      text: "При аллергии уточните у продавца состав и возможный контакт с аллергенами. Условия могут различаться у разных мастеров.",
      category,
    };
  }
  if (map) return { text: "Откройте карту BakeU, чтобы посмотреть мастеров и товары в вашем районе.", map: true };
  if (category) {
    return {
      text: "Посмотрите варианты в каталоге BakeU. Цену, размер порции и сроки лучше уточнить в карточке товара или у продавца.",
      category,
    };
  }
  return { text: "Могу направить вас в каталог или на карту. Для поиска товара напишите, что ищете, например торт, самсу, печенье или хлеб." };
}

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Страница занимает ровно 100% видимой области:
 *  - блокирует прокрутку самой страницы (прокручивается только лента сообщений);
 *  - измеряет, сколько места занимает Header, и подгоняет высоту под экран.
 */
function useFullViewport(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const html = document.documentElement;
    html.classList.add("ai-lock");
    window.scrollTo(0, 0);

    const measure = () => {
      const top = root.getBoundingClientRect().top + window.scrollY;
      root.style.setProperty("--ai-top", `${Math.max(Math.round(top), 0)}px`);
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      html.classList.remove("ai-lock");
    };
  }, [rootRef]);
}

export default function AiAssistant() {
  useLanguage();
  const [chats, setChats] = useState(loadChats);
  const [activeId, setActiveId] = useState(null); // null = новый чат
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null); // "all" или id чата

  const rootRef = useRef(null);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const confirmTimer = useRef(null);

  useFullViewport(rootRef);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeId) || null,
    [chats, activeId],
  );
  const messages = activeChat ? activeChat.messages : [];
  const isNewChat = messages.length === 0;

  // Сохранение истории
  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  // Прокрутка ленты вниз при новых сообщениях
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [messages.length, activeId]);

  // Авто-высота поля ввода
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 120)}px`;
  }, [input]);

  // Фокус на поле ввода (только на устройствах с мышью, чтобы не вызывать клавиатуру)
  useEffect(() => {
    if (window.matchMedia("(hover: hover)").matches) {
      inputRef.current?.focus();
    }
  }, [activeId]);

  // Escape закрывает панель истории
  useEffect(() => {
    if (!historyOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setHistoryOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  const askConfirm = (id) => {
    setConfirmId(id);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmId(null), 3000);
  };

  const handleSend = useCallback((text) => {
    const value = (text ?? input).trim();
    if (!value) return;

    const time = Date.now();
    const nextMessages = [
      { id: createId(), role: "user", text: value, time },
      { id: createId(), role: "assistant", ...getReply(value), time, hasCatalogAction: true },
    ];

    if (activeId) {
      setChats((current) => current.map((chat) =>
        chat.id === activeId
          ? { ...chat, updatedAt: time, messages: [...chat.messages, ...nextMessages] }
          : chat,
      ));
    } else {
      const id = createId();
      const chat = { id, title: makeTitle(value), createdAt: time, updatedAt: time, messages: nextMessages };
      setChats((current) => [chat, ...current]);
      setActiveId(id);
    }
    setInput("");
  }, [activeId, input]);

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    setActiveId(null);
    setInput("");
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const openChat = (id) => {
    setActiveId(id);
    setHistoryOpen(false);
    setConfirmId(null);
  };

  const deleteChat = (id) => {
    if (confirmId !== id) return askConfirm(id);
    setChats((prev) => prev.filter((chat) => chat.id !== id));
    if (activeId === id) setActiveId(null);
    setConfirmId(null);
    return undefined;
  };

  const clearAll = () => {
    if (confirmId !== "all") return askConfirm("all");
    setChats([]);
    setActiveId(null);
    setConfirmId(null);
    return undefined;
  };

  const groups = useMemo(() => {
    const needle = normalizeSearch(search);
    const list = needle
      ? chats.filter(
          (chat) =>
            normalizeSearch(chat.title).includes(needle) ||
            chat.messages.some((m) => normalizeSearch(m.text).includes(needle)),
        )
      : chats;
    return groupChats(list);
  }, [chats, search]);

  return (
    <div className="ai" ref={rootRef}>
      <div className="ai__card">
        {/* ===== История ===== */}
        <aside
          className={`ai-history ${historyOpen ? "is-open" : ""}`}
          aria-label={translateText("История чатов")}
        >
          <div className="ai-history__top">
            <h2>{translateText("История")}</h2>
            <button
              type="button"
              className="ai-icon-btn ai-history__close"
              onClick={() => setHistoryOpen(false)}
              aria-label={translateText("Закрыть историю")}
            >
              <X size={18} />
            </button>
          </div>

          <button type="button" className="ai-new" onClick={startNewChat}>
            <MessageSquarePlus size={17} />
            {translateText("Новый чат")}
          </button>

          {chats.length > 0 && (
            <div className="ai-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={translateText("Поиск по чатам")}
                aria-label={translateText("Поиск по истории")}
              />
            </div>
          )}

          <div className="ai-history__list" id="ai-history-list">
            {chats.length === 0 && (
              <p className="ai-history__empty">
                {translateText(
                  "Здесь появятся ваши разговоры с помощником. Задайте первый вопрос.",
                )}
              </p>
            )}

            {chats.length > 0 && groups.length === 0 && (
              <p className="ai-history__empty">
                {translateText("Ничего не найдено.")}
              </p>
            )}

            {groups.map((group) => (
              <section key={group.label} className="ai-group">
                <h3>{translateText(group.label)}</h3>
                <ul>
                  {group.items.map((chat) => (
                    <li
                      key={chat.id}
                      className={chat.id === activeId ? "is-active" : ""}
                    >
                      <button
                        type="button"
                        className="ai-chat"
                        onClick={() => openChat(chat.id)}
                        aria-current={chat.id === activeId ? "true" : undefined}
                      >
                        <span className="ai-chat__title">
                          {chat.title}
                        </span>
                        <span className="ai-chat__meta">
                          {translateText(chat.messages.length)}{" "}
                          {translateText(
                            chat.messages.length === 1 ? "сообщение" : "сообщ.",
                          )}{" "}
                          · {translateText(formatTime(chat.updatedAt))}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`ai-chat__delete ${
                          confirmId === chat.id ? "is-confirm" : ""
                        }`}
                        onClick={() => deleteChat(chat.id)}
                        aria-label={translateText(
                          confirmId === chat.id
                            ? "Подтвердить удаление"
                            : `Удалить чат: ${chat.title}`,
                        )}
                      >
                        {confirmId === chat.id ? (
                          translateText("Удалить?")
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {chats.length > 0 && (
            <button
              type="button"
              className={`ai-clear-all ${confirmId === "all" ? "is-confirm" : ""}`}
              onClick={clearAll}
            >
              <Trash2 size={15} />
              {translateText(
                confirmId === "all"
                  ? "Точно очистить всё?"
                  : "Очистить историю",
              )}
            </button>
          )}
        </aside>

        {historyOpen && (
          <button
            type="button"
            className="ai-backdrop"
            onClick={() => setHistoryOpen(false)}
            aria-label={translateText("Закрыть историю")}
            tabIndex={-1}
          />
        )}

        {/* ===== Чат ===== */}
        <section className="ai-chatpane">
          <header className="ai__header">
            <button
              type="button"
              className="ai-icon-btn ai__history-btn"
              onClick={() => setHistoryOpen(true)}
              aria-expanded={historyOpen}
              aria-controls="ai-history-list"
              aria-label={translateText("Открыть историю чатов")}
            >
              <History size={18} />
              {chats.length > 0 && (
                <span className="ai__count">{chats.length}</span>
              )}
            </button>

            <div className="ai__title">
              <span className="ai__badge" aria-hidden="true">
                <Sparkles size={16} strokeWidth={2.2} />
              </span>
              <div>
                <h1>{translateText("Помощник BakeU")}</h1>
                {activeChat && <p>{activeChat.title}</p>}
              </div>
            </div>

            <button
              type="button"
              className="ai-icon-btn"
              onClick={startNewChat}
              aria-label={translateText("Начать новый чат")}
              title={translateText("Новый чат")}
            >
              <MessageSquarePlus size={18} />
            </button>
          </header>

          <div
            className={`ai__messages ${isNewChat ? "is-empty" : ""}`}
            role="log"
            aria-live="polite"
            ref={messagesRef}
          >
            {isNewChat ? (
              <div className="ai-welcome">
                <span className="ai-welcome__badge" aria-hidden="true">
                  <Sparkles size={26} strokeWidth={2} />
                </span>
                <h2>{translateText("Чем помочь?")}</h2>
                <p>{translateText("Подберём, где искать выпечку, и поможем разобраться с выбором.")}</p>

                <div className="ai-welcome__grid">
                  {TOPICS.map(({ Icon, title, question }) => (
                    <button
                      key={title}
                      type="button"
                      className="ai-chip"
                      onClick={() => handleSend(translateText(question))}
                    >
                      <span className="ai-chip__icon"><Icon size={20} aria-hidden="true" /></span>
                      <span className="ai-chip__copy">
                        <strong>{translateText(title)}</strong>
                        <span>{translateText(question)}</span>
                      </span>
                      <ArrowUpRight className="ai-chip__arrow" size={16} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`ai-bubble ai-bubble--${message.role} ${
                    message.isError ? "ai-bubble--error" : ""
                  }`}
                >
                  <p>
                    {message.role === "assistant"
                      ? translateText(message.text)
                      : message.text}
                  </p>
                  {message.role === "assistant" && message.hasCatalogAction && (
                    <Link
                      className="ai-bubble__action"
                      to={message.map
                        ? "/map"
                        : `/seller?tab=products${message.category ? `&q=${encodeURIComponent(message.category)}` : ""}`}
                    >
                      {translateText(message.map ? "Открыть карту" : "Открыть каталог")}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  )}
                  <time dateTime={new Date(message.time).toISOString()}>
                    {translateText(formatTime(message.time))}
                  </time>
                </div>
              ))
            )}

          </div>

          <footer className="ai-composer">
            <form className="ai__form" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={translateText("Напишите, что нужно…")}
                aria-label={translateText("Сообщение помощнику")}
                autoComplete="off"
                maxLength={1000}
              />
              <button
                type="submit"
                className="ai__send"
                disabled={!input.trim()}
                aria-label={translateText("Отправить")}
              >
                <ArrowUp size={19} strokeWidth={2.6} />
              </button>
            </form>
            <p>{translateText("Помощник использует готовые ответы и ссылки BakeU.")}</p>
          </footer>
        </section>
      </div>
    </div>
  );
}

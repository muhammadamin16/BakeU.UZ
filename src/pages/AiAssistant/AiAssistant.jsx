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
  History,
  MessageSquarePlus,
  RotateCcw,
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

const SUGGESTIONS = [
  "Шоколадный торт на 8 человек до 250 000 сум",
  "Самса к ужину недорого",
  "Есть ли торт без орехов?",
  "Что вкусного рядом со мной?",
];

const GREETING =
  "Здравствуйте! Что ищем: торт на праздник, выпечку к чаю или хлеб на каждый день?";

const ERROR_TEXT = "Не удалось получить ответ. Попробуйте ещё раз.";

/** Демо-ответы. Здесь позже подключается настоящий API. */
async function getAiReply(userText) {
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));

  const lower = userText.toLowerCase();

  if (lower.includes("торт") || lower.includes("праздник")) {
    return "Отлично! Для торта уточните: сколько гостей, бюджет и есть ли аллергии (орехи, глютен и т.д.)? Могу сразу предложить варианты от 180 000 до 450 000 сум.";
  }
  if (lower.includes("самса") || lower.includes("ужин")) {
    return "Самса — отличный выбор! У нас есть классическая с мясом и куриная. Сколько штук нужно и в каком районе забрать?";
  }
  if (lower.includes("орех") || lower.includes("аллерг")) {
    return "Да, есть торты и десерты без орехов. Могу показать варианты с маркировкой «без орехов». Какой повод и на сколько человек?";
  }
  if (lower.includes("рядом") || lower.includes("близко")) {
    return "Сейчас посмотрю мастеров рядом с вами. Разрешите геолокацию или напишите район — подберу ближайшие варианты.";
  }
  return "Понял вас. Расскажите чуть подробнее: бюджет, количество гостей, повод и район — подберу самые подходящие варианты на BakeU.";
}

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString("ru-RU", {
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
  const [chats, setChats] = useState(loadChats);
  const [activeId, setActiveId] = useState(null); // null = новый чат
  const [input, setInput] = useState("");
  const [pendingId, setPendingId] = useState(null); // чат, который ждёт ответа
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
  const isTyping = pendingId !== null && pendingId === activeId;
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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [messages.length, isTyping, activeId]);

  // Авто-высота поля ввода
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 120)}px`;
  }, [input]);

  // Фокус на поле ввода (только на устройствах с мышью, чтобы не вызывать клавиатуру)
  useEffect(() => {
    if (isTyping) return;
    if (window.matchMedia("(hover: hover)").matches) {
      inputRef.current?.focus();
    }
  }, [isTyping, activeId]);

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

  const appendMessage = useCallback((chatId, message) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              updatedAt: message.time,
              messages: [...chat.messages, message],
            }
          : chat,
      ),
    );
  }, []);

  const handleSend = useCallback(
    async (text) => {
      const value = (text ?? input).trim();
      if (!value || isTyping) return;

      const time = Date.now();
      const userMessage = { id: createId(), role: "user", text: value, time };
      let chatId = activeId;

      if (!chatId) {
        chatId = createId();
        const created = {
          id: chatId,
          title: makeTitle(value),
          createdAt: time,
          updatedAt: time,
          messages: [userMessage],
        };
        setChats((prev) => [created, ...prev]);
        setActiveId(chatId);
      } else {
        appendMessage(chatId, userMessage);
      }

      setInput("");
      setPendingId(chatId);

      try {
        const replyText = await getAiReply(value);
        appendMessage(chatId, {
          id: createId(),
          role: "assistant",
          text: replyText,
          time: Date.now(),
        });
      } catch {
        appendMessage(chatId, {
          id: createId(),
          role: "assistant",
          text: ERROR_TEXT,
          time: Date.now(),
          isError: true,
        });
      } finally {
        setPendingId((current) => (current === chatId ? null : current));
      }
    },
    [input, isTyping, activeId, appendMessage],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
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
    const needle = search.trim().toLocaleLowerCase("ru-RU");
    const list = needle
      ? chats.filter(
          (chat) =>
            chat.title.toLocaleLowerCase("ru-RU").includes(needle) ||
            chat.messages.some((m) =>
              m.text.toLocaleLowerCase("ru-RU").includes(needle),
            ),
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
          aria-label="История чатов"
        >
          <div className="ai-history__top">
            <h2>История</h2>
            <button
              type="button"
              className="ai-icon-btn ai-history__close"
              onClick={() => setHistoryOpen(false)}
              aria-label="Закрыть историю"
            >
              <X size={18} />
            </button>
          </div>

          <button type="button" className="ai-new" onClick={startNewChat}>
            <MessageSquarePlus size={17} />
            Новый чат
          </button>

          {chats.length > 0 && (
            <div className="ai-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по чатам"
                aria-label="Поиск по истории"
              />
            </div>
          )}

          <div className="ai-history__list">
            {chats.length === 0 && (
              <p className="ai-history__empty">
                Здесь появятся ваши разговоры с помощником. Задайте первый
                вопрос.
              </p>
            )}

            {chats.length > 0 && groups.length === 0 && (
              <p className="ai-history__empty">Ничего не найдено.</p>
            )}

            {groups.map((group) => (
              <section key={group.label} className="ai-group">
                <h3>{group.label}</h3>
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
                        <span className="ai-chat__title">{chat.title}</span>
                        <span className="ai-chat__meta">
                          {chat.messages.length}{" "}
                          {chat.messages.length === 1 ? "сообщение" : "сообщ."} ·{" "}
                          {formatTime(chat.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`ai-chat__delete ${
                          confirmId === chat.id ? "is-confirm" : ""
                        }`}
                        onClick={() => deleteChat(chat.id)}
                        aria-label={
                          confirmId === chat.id
                            ? "Подтвердить удаление"
                            : `Удалить чат: ${chat.title}`
                        }
                      >
                        {confirmId === chat.id ? (
                          "Удалить?"
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
              {confirmId === "all" ? "Точно очистить всё?" : "Очистить историю"}
            </button>
          )}
        </aside>

        {historyOpen && (
          <button
            type="button"
            className="ai-backdrop"
            onClick={() => setHistoryOpen(false)}
            aria-label="Закрыть историю"
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
              aria-label="Открыть историю чатов"
            >
              <History size={18} />
              {chats.length > 0 && <span className="ai__count">{chats.length}</span>}
            </button>

            <div className="ai__title">
              <span className="ai__badge" aria-hidden="true">
                <Sparkles size={16} strokeWidth={2.2} />
              </span>
              <div>
                <h1>Помощник BakeU</h1>
                <p>
                  {activeChat
                    ? activeChat.title
                    : "Бюджет, повод, гости, район — обычными словами"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="ai-icon-btn"
              onClick={startNewChat}
              aria-label="Начать новый чат"
              title="Новый чат"
            >
              <RotateCcw size={17} />
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
                <h2>Чем помочь?</h2>
                <p>{GREETING}</p>

                <div className="ai-welcome__grid">
                  {SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="ai-chip"
                      onClick={() => handleSend(item)}
                    >
                      {item}
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
                  <p>{message.text}</p>
                  <time dateTime={new Date(message.time).toISOString()}>
                    {formatTime(message.time)}
                  </time>
                </div>
              ))
            )}

            {isTyping && (
              <div
                className="ai-bubble ai-bubble--assistant ai-bubble--typing"
                aria-label="Помощник печатает"
              >
                <span className="ai-dot" />
                <span className="ai-dot" />
                <span className="ai-dot" />
              </div>
            )}
          </div>

          <form className="ai__form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите, что нужно…"
              aria-label="Сообщение помощнику"
              autoComplete="off"
              maxLength={1000}
            />
            <button
              type="submit"
              className="ai__send"
              disabled={!input.trim() || isTyping}
              aria-label="Отправить"
            >
              <ArrowUp size={19} strokeWidth={2.6} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
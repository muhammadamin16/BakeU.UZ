import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, RotateCcw, X } from "lucide-react";
import "./AiAssistant.css";

const SUGGESTIONS = [
  "Шоколадный торт на 8 человек до 250 000 сум",
  "Самса к ужину недорого",
  "Есть ли торт без орехов?",
  "Что вкусного рядом со мной?",
];

const INITIAL_MESSAGE = {
  id: 1,
  role: "assistant",
  text: "Здравствуйте! Что ищем: торт на праздник, выпечку к чаю или хлеб на каждый день?",
};

export default function AiAssistant() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const getAiReply = useCallback(async (userText) => {
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));

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
  }, []);

  const handleSend = useCallback(
    async (text) => {
      const value = (text ?? input).trim();
      if (!value || isTyping) return;

      const userMessage = {
        id: Date.now(),
        role: "user",
        text: value,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setShowSuggestions(false);
      setIsTyping(true);

      try {
        const replyText = await getAiReply(value);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: replyText,
          },
        ]);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    },
    [input, isTyping, getAiReply]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setShowSuggestions(true);
    setIsTyping(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai">
      <div className="ai__card">
        {/* Header */}
        <header className="ai__header">
          <div className="ai__header-top">
            <div className="ai__badge">
              <Sparkles size={15} strokeWidth={2.2} />
              <span>YORDAMCHI BAKEU</span>
            </div>

            <button
              type="button"
              className="ai__reset"
              onClick={handleReset}
              aria-label="Начать заново"
              title="Начать заново"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <p className="ai__desc">
            Бюджет, повод, гости, район и дата — расскажите обычными словами.
          </p>
        </header>

        {/* Messages */}
        <div className="ai__messages" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-bubble ai-bubble--${msg.role}`}
            >
              <p>{msg.text}</p>
            </div>
          ))}

          {isTyping && (
            <div className="ai-bubble ai-bubble--assistant ai-bubble--typing">
              <span className="ai-dot" />
              <span className="ai-dot" />
              <span className="ai-dot" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && !isTyping && (
          <div className="ai__suggestions">
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
        )}

        {/* Input */}
        <form className="ai__form" onSubmit={handleSubmit}>
          <div className="ai__input-wrap">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите, что нужно…"
              aria-label="Сообщение помощнику"
              disabled={isTyping}
              autoComplete="off"
            />

            {input && (
              <button
                type="button"
                className="ai__clear"
                onClick={() => setInput("")}
                aria-label="Очистить"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="ai__send"
            disabled={!input.trim() || isTyping}
            aria-label="Отправить"
          >
            <span>ОТПРАВИТЬ</span>
            <Send size={15} strokeWidth={2.3} />
          </button>
        </form>
      </div>
    </div>
  );
}
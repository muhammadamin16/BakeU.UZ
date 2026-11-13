
import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import {
  X,
  ArrowRight,
  ShoppingBag,
  Store,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

import "./AuthModal.css";

const MODAL_DELAY = 5000;

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const navigate = useNavigate();

  const modalRef = useRef(null);
  const primaryRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const dismissedRef = useRef(false);

  // Показ через 5 секунд
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!dismissedRef.current) {
        setIsOpen(true);
      }
    }, MODAL_DELAY);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Плавное закрытие
  const closeModal = useCallback((callback) => {
    if (dismissedRef.current) return;

    dismissedRef.current = true;
    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);

      if (typeof callback === "function") {
        callback();
      }
    }, 280);
  }, []);

  // Переход на страницу
  const handleNavigate = (path) => {
    closeModal(() => navigate(path));
  };

  // Управление фокусом и прокруткой
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    primaryRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }

      if (
        event.key === "Tab" &&
        modalRef.current
      ) {
        const elements = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled])'
          )
        );

        if (!elements.length) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`bakeu-glass-overlay ${
        isClosing ? "is-closing" : ""
      }`}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          closeModal();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bakeu-glass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bakeu-glass-title"
        aria-describedby="bakeu-glass-description"
      >
        {/* Стеклянные блики */}
        <div className="bakeu-glass-shine" />
        <div className="bakeu-glass-orb orb-one" />
        <div className="bakeu-glass-orb orb-two" />

        {/* Верхняя панель */}
        <div className="bakeu-glass-topbar">
          <div className="bakeu-glass-brand">
            <div className="bakeu-glass-brand-icon">
              🥐
            </div>

            <div className="bakeu-glass-brand-text">
              <strong>BakeU</strong>
              <span>MARKETPLACE</span>
            </div>
          </div>

          <button
            type="button"
            className="bakeu-glass-close"
            onClick={() => closeModal()}
            aria-label="Закрыть окно"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>

        {/* Основной контент */}
        <div className="bakeu-glass-content">
          <div className="bakeu-glass-label">
            <Sparkles size={14} />
            <span>ДОБРО ПОЖАЛОВАТЬ</span>
          </div>

          <h2 id="bakeu-glass-title">
            Мир вкусных
            <span> открытий</span>
          </h2>

          <p
            id="bakeu-glass-description"
            className="bakeu-glass-description"
          >
            Находите любимые десерты,
            заказывайте свежую выпечку
            или откройте собственный магазин
            вместе с BakeU.
          </p>

          {/* Возможности */}
          <div className="bakeu-glass-features">
            <div className="bakeu-glass-feature">
              <div className="bakeu-glass-feature-icon">
                <ShoppingBag size={19} />
              </div>

              <div>
                <strong>Покупателям</strong>
                <span>Любимые десерты рядом</span>
              </div>
            </div>

            <div className="bakeu-glass-feature">
              <div className="bakeu-glass-feature-icon">
                <Store size={19} />
              </div>

              <div>
                <strong>Продавцам</strong>
                <span>Ваш магазин онлайн</span>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="bakeu-glass-actions">
            <button
              ref={primaryRef}
              type="button"
              className="bakeu-glass-primary"
              onClick={() =>
                handleNavigate("/register")
              }
            >
              <span>Создать аккаунт</span>
              <ArrowRight size={19} />
            </button>

            <button
              type="button"
              className="bakeu-glass-secondary"
              onClick={() =>
                handleNavigate("/login")
              }
            >
              <span>
                У меня уже есть аккаунт
              </span>
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            className="bakeu-glass-skip"
            onClick={() => closeModal()}
          >
            Продолжить без регистрации
          </button>

          {/* Нижняя панель */}
          <div className="bakeu-glass-footer">
            <ShieldCheck size={15} />
            <span>
              Комфортные покупки с BakeU
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


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
} from "lucide-react";

import "./AuthModal.css";

const MODAL_DELAY = 5000;
const CLOSE_DURATION = 220;

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const navigate = useNavigate();

  const modalRef = useRef(null);
  const primaryRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const dismissedRef = useRef(false);

  // Открытие через 5 секунд
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

  // Закрытие с анимацией
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
    }, CLOSE_DURATION);
  }, []);

  // Навигация
  const handleNavigate = (path) => {
    closeModal(() => navigate(path));
  };

  // Фокус и блокировка прокрутки
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

      if (event.key === "Tab" && modalRef.current) {
        const elements = Array.from(
          modalRef.current.querySelectorAll(
            "button:not([disabled]), a[href]"
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
      className={`bakeu-auth-overlay ${
        isClosing ? "is-closing" : ""
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <section
        ref={modalRef}
        className="bakeu-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bakeu-auth-title"
        aria-describedby="bakeu-auth-description"
      >
        {/* Close */}
        <button
          type="button"
          className="bakeu-auth-close"
          onClick={() => closeModal()}
          aria-label="Закрыть окно"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="bakeu-auth-logo">
          <span>🥐</span>
        </div>

        {/* Eyebrow */}
        <div className="bakeu-auth-eyebrow">
          <Sparkles size={13} />
          <span>BAKEU MARKETPLACE</span>
        </div>

        {/* Heading */}
        <h2 id="bakeu-auth-title">
          Добро пожаловать
          <span> в BakeU</span>
        </h2>

        <p
          id="bakeu-auth-description"
          className="bakeu-auth-description"
        >
          Откройте для себя мир свежей выпечки
          и любимых десертов. Покупайте,
          продавайте и вдохновляйтесь вместе с нами.
        </p>

        {/* Features */}
        <div className="bakeu-auth-features">
          <div className="bakeu-auth-feature">
            <div className="bakeu-auth-feature-icon">
              <ShoppingBag size={17} />
            </div>
            <div>
              <strong>Для покупателей</strong>
              <span>Вкусное рядом</span>
            </div>
          </div>

          <div className="bakeu-auth-feature">
            <div className="bakeu-auth-feature-icon">
              <Store size={17} />
            </div>
            <div>
              <strong>Для продавцов</strong>
              <span>Развивайте бизнес</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bakeu-auth-actions">
          <button
            ref={primaryRef}
            type="button"
            className="bakeu-auth-primary"
            onClick={() => handleNavigate("/register")}
          >
            Создать аккаунт
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            className="bakeu-auth-secondary"
            onClick={() => handleNavigate("/login")}
          >
            Войти в аккаунт
          </button>
        </div>

        {/* Skip */}
        <button
          type="button"
          className="bakeu-auth-skip"
          onClick={() => closeModal()}
        >
          Продолжить без регистрации
        </button>

        {/* Footer */}
        <div className="bakeu-auth-footer">
          <ShieldCheck size={14} />
          <span>Удобные покупки с BakeU</span>
        </div>
      </section>
    </div>,
    document.body
  );
}

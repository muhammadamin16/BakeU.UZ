import { translateText } from "../../i18n/index.js";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { ArrowRight, X } from "lucide-react";

import {
  isLoggedIn,
  wasAuthModalDismissed,
  markAuthModalDismissed,
} from "../../store/session";

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

  // Modal haqiqatan ko'rinishi kerakmi: ochiq va foydalanuvchi kirmagan
  const visible = isOpen && !isLoggedIn();

  // 5 soniyadan keyin ochish (faqat kirmagan foydalanuvchiga)
  useEffect(() => {
    if (isLoggedIn() || wasAuthModalDismissed()) return;

    const timer = window.setTimeout(() => {
      // Taymer ishlagan paytda qayta tekshiramiz
      if (!dismissedRef.current && !wasAuthModalDismissed() && !isLoggedIn()) {
        setIsOpen(true);
      }
    }, MODAL_DELAY);

    return () => window.clearTimeout(timer);
  }, []);

  // Unmount bo'lganda yopilish taymerini tozalash
  useEffect(() => {
    return () => window.clearTimeout(closeTimerRef.current);
  }, []);

  // Animatsiya bilan yopish
  const closeModal = useCallback((callback) => {
    if (dismissedRef.current) return;

    dismissedRef.current = true;
    markAuthModalDismissed();
    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);

      if (typeof callback === "function") {
        callback();
      }
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : CLOSE_DURATION);
  }, []);

  const handleNavigate = (path) => {
    closeModal(() => navigate(path));
  };

  // Fokus, scroll bloklash va klaviatura
  useEffect(() => {
    if (!visible) return;

    previousFocusRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const root = document.getElementById("root");
    const wasInert = root?.inert;
    if (root) root.inert = true;

    primaryRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const elements = Array.from(
          modalRef.current.querySelectorAll("button:not([disabled]), a[href]"),
        );

        if (!elements.length) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (root) root.inert = wasInert;
      previousFocusRef.current?.focus?.();
    };
  }, [visible, closeModal]);

  if (!visible) return null;

  return createPortal(
    <div
      className={`bakeu-auth-overlay ${isClosing ? "is-closing" : ""}`}
      onClick={(event) => {
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
        <button
          type="button"
          className="bakeu-auth-close"
          onClick={() => closeModal()}
          aria-label={translateText("Закрыть окно")}
        >
          <X size={19} aria-hidden="true" />
        </button>

        <div className="bakeu-auth-intro">
          <img className="bakeu-auth-logo" src="/images/logo-bear.png" width="2172" height="724" alt="BakeU" />
          <h2 id="bakeu-auth-title">{translateText("Добро пожаловать")}</h2>
          <p id="bakeu-auth-description">
            {translateText("Войдите, чтобы оформлять заказы и сохранять любимую выпечку.")}
          </p>
        </div>

        <div className="bakeu-auth-actions">
          <button
            ref={primaryRef}
            type="button"
            className="bakeu-auth-primary"
            onClick={() => handleNavigate("/register")}
          >
            {translateText("Создать аккаунт")}
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="bakeu-auth-secondary"
            onClick={() => handleNavigate("/login")}
          >
            {translateText("Войти в аккаунт")}
          </button>
        </div>

        <button
          type="button"
          className="bakeu-auth-skip"
          onClick={() => closeModal()}
        >
          {translateText("Продолжить без регистрации")}
        </button>

      </section>
    </div>,
    document.body,
  );
}

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { registerLocal } from "../../../store/localAccount";
import { isLoggedIn } from "../../../store/session";
import AuthShell from "../AuthShell";
import "../Auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  company: "",
  location: "",
};

const ROLES = [
  {
    id: "client",
    icon: ShoppingBag,
    title: "Покупатель",
    text: "Покупайте товары и находите рецепты",
  },
  {
    id: "seller",
    icon: Store,
    title: "Продавец",
    text: "Создайте магазин и продавайте товары",
  },
];

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}) {
  return (
    <div className="bk-field">
      <label htmlFor={id}>{label}</label>
      <div className="bk-input">
        <Icon size={18} />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("client");
  const [form, setForm] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoggedIn()) return <Navigate to="/profile" replace />;

  const isSeller = role === "seller";

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.password
    )
      return setError("Заполните все обязательные поля.");
    if (!EMAIL_RE.test(form.email.trim()))
      return setError("Введите корректный email.");
    if (form.password.length < 8)
      return setError("Пароль должен содержать минимум 8 символов.");
    if (isSeller && (!form.company.trim() || !form.location.trim()))
      return setError("Укажите название магазина и местоположение.");

    setBusy(true);
    try {
      await registerLocal(form, role);
      navigate("/profile", { replace: true });
    } catch (e) {
      setError(e.message || "Не удалось создать аккаунт");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell wide={step === 2}>
      <div className="bk-progress" aria-hidden="true">
        <span className="is-done" />
        <span className={step === 2 ? "is-done" : ""} />
      </div>

      {step === 1 ? (
        <>
          <header className="bk-head">
            <h1>Создать аккаунт</h1>
            <p>Как вы планируете использовать BakeU?</p>
          </header>

          <div className="bk-roles" role="radiogroup" aria-label="Тип аккаунта">
            {ROLES.map(({ id, icon: Icon, title, text }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={role === id}
                className={`bk-role ${role === id ? "is-selected" : ""}`}
                onClick={() => setRole(id)}
              >
                <span className="bk-role__icon">
                  <Icon size={20} />
                </span>
                <span className="bk-role__text">
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
                <span className="bk-role__check">
                  <Check size={13} strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>

          <button
            className="bk-primary"
            type="button"
            onClick={() => setStep(2)}
          >
            Продолжить <ArrowRight size={18} />
          </button>
        </>
      ) : (
        <>
          <header className="bk-head">
            <button
              type="button"
              className="bk-link-back"
              onClick={() => {
                setStep(1);
                setError("");
              }}
            >
              <ArrowLeft size={15} /> Назад
            </button>
            <h1>{isSeller ? "Данные продавца" : "Ваши данные"}</h1>
            <p>
              {isSeller
                ? "Расскажите о себе и своём магазине."
                : "Заполните данные для регистрации."}
            </p>
          </header>

          <form className="bk-form bk-form--grid" onSubmit={submit} noValidate>
            <Field
              id="reg-first"
              label="Имя"
              icon={UserRound}
              value={form.firstName}
              onChange={(v) => update("firstName", v)}
              placeholder="Ваше имя"
              autoComplete="given-name"
            />
            <Field
              id="reg-last"
              label="Фамилия"
              icon={UserRound}
              value={form.lastName}
              onChange={(v) => update("lastName", v)}
              placeholder="Ваша фамилия"
              autoComplete="family-name"
            />
            <Field
              id="reg-email"
              label="Почта"
              icon={Mail}
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              placeholder="example@gmail.com"
              autoComplete="email"
            />
            <Field
              id="reg-phone"
              label="Телефон"
              icon={Phone}
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              placeholder="+998 90 123 45 67"
              autoComplete="tel"
            />

            {isSeller && (
              <>
                <Field
                  id="reg-company"
                  label="Магазин"
                  icon={Building2}
                  value={form.company}
                  onChange={(v) => update("company", v)}
                  placeholder="Sweet Bakery"
                  autoComplete="organization"
                />
                <Field
                  id="reg-location"
                  label="Местоположение"
                  icon={MapPin}
                  value={form.location}
                  onChange={(v) => update("location", v)}
                  placeholder="Город, район"
                  autoComplete="street-address"
                />
              </>
            )}

            <div className="bk-field bk-field--wide">
              <label htmlFor="reg-password">Пароль</label>
              <div className="bk-input">
                <LockKeyhole size={18} />
                <input
                  id="reg-password"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Минимум 8 символов"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="bk-eye"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="bk-alert bk-field--wide" role="alert">
                <TriangleAlert size={16} />
                {error}
              </p>
            )}

            <button
              className="bk-primary bk-field--wide"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="bk-spin" /> Создаём…
                </>
              ) : (
                <>
                  Создать демо-профиль <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </>
      )}

      <p className="bk-switch">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
      {step === 2 && (
        <p className="bk-note">
          Демо-режим: пароль не сохраняется и не отправляется на сервер.
        </p>
      )}
    </AuthShell>
  );
}
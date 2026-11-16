import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { translateText as t } from "../../../i18n/index.js";
import { authReturnTo, authLink } from "../../../store/navigation";
import { accountApiEnabled } from "../../../bot/client/accountApi";
import { registerLocal } from "../../../store/localAccount";
import { isLoggedIn } from "../../../store/session";
import AuthShell from "../AuthShell";
import AuthField from "../AuthField";
import "../Auth.css";

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
    text: "Находите любимую выпечку и общайтесь с мастерами",
  },
  {
    id: "seller",
    icon: Store,
    title: "Продавец",
    text: "Расскажите о своём деле и откройте магазин",
  },
];
export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = authReturnTo(params);
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("client");
  const [form, setForm] = useState(EMPTY);
  const [fields, setFields] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorRef = useRef(null);
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  if (isLoggedIn()) return <Navigate to={returnTo} replace />;
  const isSeller = role === "seller";
  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFields((f) => ({ ...f, [key]: "" }));
    setError("");
  }
  function changeRole(event) {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const next = role === "client" ? "seller" : "client";
    setRole(next);
    event.currentTarget.querySelector(`[data-role="${next}"]`)?.focus();
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = {};
    if (form.firstName.trim().length < 2 || form.firstName.trim().length > 100)
      invalid.firstName = "Введите имя: от 2 до 100 символов.";
    if (form.lastName.trim().length < 2 || form.lastName.trim().length > 100)
      invalid.lastName = "Введите фамилию: от 2 до 100 символов.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      invalid.email = "Введите корректный email.";
    let phone = form.phone.replace(/\D/g, "");
    if (phone.length === 9) phone = "998" + phone;
    if (!/^998\d{9}$/.test(phone))
      invalid.phone = "Укажите телефон Узбекистана: +998 и 9 цифр.";
    if (form.password.length < 8)
      invalid.password = "Пароль должен содержать минимум 8 символов.";
    if (isSeller && !form.company.trim())
      invalid.company = "Укажите название магазина";
    if (isSeller && !form.location.trim())
      invalid.location = "Укажите местоположение магазина";
    setFields(invalid);
    if (Object.keys(invalid).length) {
      const ids = {
        firstName: "reg-first",
        lastName: "reg-last",
        email: "reg-email",
        phone: "reg-phone",
        password: "reg-password",
        company: "reg-company",
        location: "reg-location",
      };
      document.getElementById(ids[Object.keys(invalid)[0]])?.focus();
      return;
    }
    setBusy(true);
    try {
      await registerLocal(
        {
          ...form,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: "+" + phone,
          company: form.company.trim(),
          location: form.location.trim(),
        },
        role,
      );
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(e.message || "Не удалось создать аккаунт");
    } finally {
      setBusy(false);
    }
  }
  function field(key, id, label, icon, options = {}) {
    return (
      <AuthField
        key={key}
        id={id}
        name={key}
        label={label}
        icon={icon}
        value={form[key]}
        onChange={(v) => update(key, v)}
        error={fields[key]}
        disabled={busy}
        {...options}
      />
    );
  }
  return (
    <AuthShell wide={step === 2}>
      <ol className="bk-progress" aria-label={t("Шаги регистрации")}>
        <li className="is-done" aria-current={step === 1 ? "step" : undefined}>
          <span>
            {step === 2 ? <Check size={13} aria-hidden="true" /> : "1"}
          </span>
          {t("Тип аккаунта")}
        </li>
        <li
          className={step === 2 ? "is-done" : ""}
          aria-current={step === 2 ? "step" : undefined}
        >
          <span>2</span>
          {t("Ваши данные")}
        </li>
      </ol>
      <header className="bk-head">
        {step === 2 && (
          <button
            type="button"
            className="bk-link-back"
            disabled={busy}
            onClick={() => {
              setStep(1);
              setError("");
            }}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            {t("Назад")}
          </button>
        )}
        <span className="bk-kicker">{t("ВАША ИСТОРИЯ НА BAKEU")}</span>
        <h1 ref={headingRef} tabIndex={-1}>
          {t(
            step === 1
              ? "Создать аккаунт"
              : isSeller
                ? "Данные продавца"
                : "Ваши данные",
          )}
        </h1>
        <p>
          {t(
            step === 1
              ? "Как вы планируете использовать BakeU?"
              : isSeller
                ? "Расскажите о себе и своём магазине."
                : "Заполните данные для регистрации.",
          )}
        </p>
      </header>
      {step === 1 ? (
        <>
          <div
            className="bk-roles"
            role="radiogroup"
            aria-label={t("Тип аккаунта")}
            onKeyDown={changeRole}
          >
            {ROLES.map(({ id, icon: Icon, title, text }) => (
              <button
                key={id}
                type="button"
                role="radio"
                data-role={id}
                aria-checked={role === id}
                tabIndex={role === id ? 0 : -1}
                className={`bk-role${role === id ? " is-selected" : ""}`}
                onClick={() => setRole(id)}
              >
                <span className="bk-role__icon">
                  <Icon size={23} aria-hidden="true" />
                </span>
                <span className="bk-role__text">
                  <strong>{t(title)}</strong>
                  <small>{t(text)}</small>
                </span>
                <span className="bk-role__check">
                  {role === id && <Check size={13} aria-hidden="true" />}
                </span>
              </button>
            ))}
          </div>
          <button
            className="bk-primary"
            type="button"
            onClick={() => setStep(2)}
          >
            {t("Продолжить")}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </>
      ) : (
        <form
          className="bk-form bk-form--grid"
          onSubmit={submit}
          noValidate
          aria-busy={busy}
        >
          {field("firstName", "reg-first", "Имя", UserRound, {
            placeholder: "Ваше имя",
            autoComplete: "given-name",
            maxLength: 100,
          })}
          {field("lastName", "reg-last", "Фамилия", UserRound, {
            placeholder: "Ваша фамилия",
            autoComplete: "family-name",
            maxLength: 100,
          })}
          {field("email", "reg-email", "Почта", Mail, {
            type: "email",
            inputMode: "email",
            placeholder: "example@gmail.com",
            autoComplete: "email",
            maxLength: 254,
          })}
          {field("phone", "reg-phone", "Телефон", Phone, {
            type: "tel",
            inputMode: "tel",
            placeholder: "+998 90 123 45 67",
            autoComplete: "tel",
            maxLength: 24,
          })}
          {isSeller && (
            <>
              {field("company", "reg-company", "Магазин", Building2, {
                placeholder: "Название магазина",
                autoComplete: "organization",
                maxLength: 150,
              })}
              {field("location", "reg-location", "Местоположение", MapPin, {
                placeholder: "Город, район",
                autoComplete: "street-address",
                maxLength: 300,
              })}
            </>
          )}
          <div className="bk-field--wide">
            {field("password", "reg-password", "Пароль", LockKeyhole, {
              type: "password",
              placeholder: "Минимум 8 символов",
              autoComplete: "new-password",
              minLength: 8,
              hint: "Используйте не меньше 8 символов",
            })}
          </div>
          {error && (
            <p
              className="bk-alert bk-field--wide"
              role="alert"
              tabIndex={-1}
              ref={errorRef}
            >
              <TriangleAlert size={17} aria-hidden="true" />
              {t(error)}
            </p>
          )}
          <button
            className="bk-primary bk-field--wide"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 size={18} className="bk-spin" aria-hidden="true" />
                {t("Создаём…")}
              </>
            ) : (
              <>
                {t(
                  accountApiEnabled
                    ? "Создать аккаунт"
                    : "Создать демо-профиль",
                )}
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      )}
      <p className="bk-switch">
        {t("Уже есть аккаунт?")}{" "}
        <Link to={authLink("/login", params)}>
          {t("Войти")}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </p>
      <p className="bk-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          {t(
            accountApiEnabled
              ? "Аккаунт сохраняется на сервере BakeU. Администратор получит уведомление о регистрации без пароля."
              : "Демо-режим: аккаунт хранится только в этом браузере.",
          )}
        </span>
      </p>
    </AuthShell>
  );
}

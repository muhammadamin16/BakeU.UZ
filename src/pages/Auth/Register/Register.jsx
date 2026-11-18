import { translateText } from "../../../i18n/index.js";
import { authReturnTo, authLink } from "../../../store/navigation";
import { accountApiEnabled, startTelegramRegistration, verifyTelegramRegistration } from "../../../bot/client/accountApi";
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Phone,
  ShoppingBag,
  Store,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { isLoggedIn } from "../../../store/session";
import AuthShell from "../AuthShell";
import "../Auth.css";

const EMPTY = {
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
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
      <label htmlFor={id}>{translateText(label)}</label>
      <div className="bk-input">
        <Icon size={18} />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={translateText(placeholder)}
          autoComplete={autoComplete}
          required
        />
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = authReturnTo(params);
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("client");
  const [form, setForm] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [botUrl, setBotUrl] = useState("");

  if (isLoggedIn()) return <Navigate to={returnTo} replace />;

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
      !form.password
    )
      return setError("Заполните все обязательные поля.");
    if (!/^998\d{9}$/.test(form.phone.replace(/\D/g, "")))
      return setError("Введите номер в формате +998 XX XXX XX XX.");
    if (form.password.length < 8)
      return setError("Пароль должен содержать минимум 8 символов.");

    // Open a tab during the user gesture so browsers do not block Telegram after an API await.
    const telegramTab = accountApiEnabled ? window.open("about:blank", "_blank") : null;
    if (telegramTab) telegramTab.opener = null;
    setBusy(true);
    try {
      if (!accountApiEnabled) {
        throw Error("Для подтверждения через Telegram подключите BakeU Bot API.");
      }
      const result = await startTelegramRegistration(form, role);
      setPendingToken(result.token);
      setBotUrl(result.botUrl);
      setStep(3);
      if (telegramTab) telegramTab.location.replace(result.botUrl);
    } catch (e) {
      telegramTab?.close();
      setError(e.message || "Не удалось создать аккаунт");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(event) {
    event.preventDefault();
    if (busy || !pendingToken) return;
    setBusy(true);
    setError("");
    try {
      await verifyTelegramRegistration(pendingToken, verificationCode.trim());
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(e.message || "Код не подошёл.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell wide={step !== 1}>
      <div className="bk-progress" aria-hidden="true">
        <span className="is-done" />
        <span className={step !== 1 ? "is-done" : ""} />
      </div>

      {step === 1 ? (
        <>
          <header className="bk-head">
            <h1>{translateText("Создать аккаунт")}</h1>
            <p>{translateText("Как вы планируете использовать BakeU?")}</p>
          </header>

          <div
            className="bk-roles"
            role="radiogroup"
            aria-label={translateText("Тип аккаунта")}
          >
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
                  <strong>{translateText(title)}</strong>
                  <small>{translateText(text)}</small>
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
            {translateText("Продолжить ")}
            <ArrowRight size={18} />
          </button>
        </>
      ) : step === 3 ? (
        <>
          <header className="bk-head">
            <h1>{translateText("Подтверждение телефона")}</h1>
            <p>{translateText("Откройте Telegram, нажмите Start, поделитесь своим номером и введите код из бота.")}</p>
          </header>
          {botUrl && (
            <p className="bk-switch">
              <a href={botUrl} target="_blank" rel="noopener noreferrer">
                {translateText("Открыть Telegram бот")}
              </a>
            </p>
          )}
          <form className="bk-form" onSubmit={confirmCode}>
            <div className="bk-field">
              <label htmlFor="reg-code">{translateText("Код из Telegram")}</label>
              <div className="bk-input">
                <input
                  id="reg-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </div>
            </div>
            {error && <p className="bk-alert" role="alert">{translateText(error)}</p>}
            <button className="bk-primary" type="submit" disabled={busy || verificationCode.length !== 6}>
              {translateText("Подтвердить код")} <ArrowRight size={18} />
            </button>
          </form>
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
              <ArrowLeft size={15} />
              {translateText(" Назад")}
            </button>
            <h1>
              {translateText(isSeller ? "Данные продавца" : "Ваши данные")}
            </h1>
            <p>
              {translateText(
                isSeller
                  ? "Заполните основные данные. Магазин добавите позже в профиле."
                  : "Заполните данные для регистрации.",
              )}
            </p>
          </header>

          <form className="bk-form bk-form--grid" onSubmit={submit} noValidate>
            <Field
              id="reg-first"
              label={translateText("Имя")}
              icon={UserRound}
              value={form.firstName}
              onChange={(v) => update("firstName", v)}
              placeholder={translateText("Ваше имя")}
              autoComplete="given-name"
            />
            <Field
              id="reg-last"
              label={translateText("Фамилия")}
              icon={UserRound}
              value={form.lastName}
              onChange={(v) => update("lastName", v)}
              placeholder={translateText("Ваша фамилия")}
              autoComplete="family-name"
            />
            <Field
              id="reg-phone"
              label={translateText("Телефон")}
              icon={Phone}
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              placeholder="+998 90 123 45 67"
              autoComplete="tel"
            />

            <div className="bk-field bk-field--wide">
              <label htmlFor="reg-password">{translateText("Пароль")}</label>
              <div className="bk-input">
                <LockKeyhole size={18} />
                <input
                  id="reg-password"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={translateText("Минимум 8 символов")}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="bk-eye"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={translateText(
                    visible ? "Скрыть пароль" : "Показать пароль",
                  )}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="bk-alert bk-field--wide" role="alert">
                <TriangleAlert size={16} />
                {translateText(error)}
              </p>
            )}

            <button
              className="bk-primary bk-field--wide"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="bk-spin" />
                  {translateText(" Создаём…")}
                </>
              ) : (
                <>
                  {translateText(
                    "Отправить код",
                  )}{" "}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </>
      )}

      <p className="bk-switch">
        {translateText("Уже есть аккаунт? ")}
        <Link to={authLink("/login", params)}>{translateText("Войти")}</Link>
      </p>
      {step === 2 && (
        <p className="bk-note">
          {translateText(
            "Регистрация завершится только после подтверждения номера в Telegram.",
          )}
        </p>
      )}
    </AuthShell>
  );
}

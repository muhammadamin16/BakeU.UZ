import { translateText } from "../../../i18n/index.js";
import { authReturnTo, authLink } from "../../../store/navigation";
import { accountApiEnabled, startTelegramRegistration, verifyTelegramRegistration } from "../../../bot/client/accountApi";
import { useState } from "react";

import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShoppingBag,
  Store,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { isLoggedIn } from "../../../store/session";
import AuthShell from "../AuthShell";
import PhoneInput from "../PhoneInput";
import { completeUzPhone } from "../uzPhone";
import PhoneVerification from "../PhoneVerification";
import { readPhoneChallenge, savePhoneChallenge } from "../phoneChallenge";

const PENDING_KEY = "bakeu-telegram-pending-registration";

const EMPTY = {
  firstName: "",
  lastName: "",
  phone: "",
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
  const [pending] = useState(() => readPhoneChallenge(PENDING_KEY));
  const [step, setStep] = useState(() => pending ? 3 : 1);
  const [role, setRole] = useState(() => pending?.role || "client");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingToken, setPendingToken] = useState(() => pending?.token || "");
  const [botUrl, setBotUrl] = useState(() => pending?.botUrl || "");

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
      !form.phone.trim()
    )
      return setError("Заполните все обязательные поля.");
    if (!completeUzPhone(form.phone))
      return setError("Введите номер в формате +998 XX XXX XX XX.");

    setBusy(true);
    try {
      if (!accountApiEnabled) {
        throw Error("Для подтверждения через Telegram подключите BakeU Bot API.");
      }
      const result = await startTelegramRegistration({ ...form, phone: completeUzPhone(form.phone) }, role);
      savePhoneChallenge(PENDING_KEY, result, { role });
      setPendingToken(result.token);
      setBotUrl(result.botUrl);
      setStep(3);
    } catch (e) {
      setError(e.message || "Не удалось создать аккаунт");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(code) {
    if (busy || !pendingToken) return;
    setBusy(true);
    setError("");
    try {
      await verifyTelegramRegistration(pendingToken, code);
      sessionStorage.removeItem(PENDING_KEY);
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(e.message || "Код не подошёл.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <ol className="bk-progress" aria-label={translateText("Этапы регистрации")}>
        {["Тип аккаунта", "Ваши данные", "Подтверждение телефона"].map((label, index) => (
          <li key={label} className={index < step ? "is-done" : undefined} aria-current={index + 1 === step ? "step" : undefined}>
            {translateText(label)}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <>
          <header className="bk-head">
            <h1 id="bk-auth-title">{translateText("Создать аккаунт")}</h1>
            <p>{translateText("Как вы планируете использовать BakeU?")}</p>
          </header>

          <div
            className="bk-roles"
            role="radiogroup"
            aria-label={translateText("Тип аккаунта")}
          >
            {ROLES.map(({ id, icon: Icon, title, text }) => (
              <label key={id} className="bk-role">
                <input type="radio" name="account-role" value={id} checked={role === id} onChange={() => setRole(id)} />
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
              </label>
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
        <PhoneVerification
          botUrl={botUrl}
          busy={busy}
          error={error}
          onVerify={confirmCode}
          onCodeChange={() => setError("")}
          onEdit={() => {
            sessionStorage.removeItem(PENDING_KEY);
            setPendingToken("");
            setBotUrl("");
            setError("");
            setStep(2);
          }}
        />
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
            <h1 id="bk-auth-title">
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
            <div className="bk-field bk-field--wide">
              <label htmlFor="reg-phone">{translateText("Телефон")}</label>
              <PhoneInput
                id="reg-phone"
                value={form.phone}
                onChange={(value) => update("phone", value)}
              />
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

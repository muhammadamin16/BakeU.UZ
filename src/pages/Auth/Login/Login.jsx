import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { translateText as t } from "../../../i18n/index.js";
import { authReturnTo, authLink } from "../../../store/navigation";
import { accountApiEnabled } from "../../../bot/client/accountApi";
import { loginLocal } from "../../../store/localAccount";
import { isLoggedIn } from "../../../store/session";
import AuthShell from "../AuthShell";
import AuthField from "../AuthField";
import "../Auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = authReturnTo(params);
  const [form, setForm] = useState({ email: "", password: "" });
  const [fields, setFields] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  if (isLoggedIn()) return <Navigate to={returnTo} replace />;

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFields((f) => ({ ...f, [key]: "" }));
    setError("");
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = {};
    if (!EMAIL_RE.test(form.email.trim()))
      invalid.email = "Введите корректный email.";
    if (!form.password) invalid.password = "Введите пароль";
    setFields(invalid);
    if (Object.keys(invalid).length) {
      document.getElementById(`login-${Object.keys(invalid)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await loginLocal(form.email.trim(), form.password);
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(e.message || "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <header className="bk-head">
        <span className="bk-kicker">{t("РАДЫ ВАС ВИДЕТЬ")}</span>
        <h1>{t("С возвращением")}</h1>
        <p>{t("Войдите, чтобы продолжить покупки и управлять профилем.")}</p>
      </header>
      <form className="bk-form" onSubmit={submit} noValidate aria-busy={busy}>
        <AuthField
          id="login-email"
          name="email"
          label="Электронная почта"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="example@gmail.com"
          value={form.email}
          onChange={(v) => update("email", v)}
          error={fields.email}
          disabled={busy}
          maxLength={254}
        />
        <AuthField
          id="login-password"
          name="password"
          label="Пароль"
          icon={LockKeyhole}
          type="password"
          autoComplete="current-password"
          placeholder="Введите пароль"
          value={form.password}
          onChange={(v) => update("password", v)}
          error={fields.password}
          disabled={busy}
        />
        {error && (
          <p className="bk-alert" role="alert" tabIndex={-1} ref={errorRef}>
            <TriangleAlert size={17} aria-hidden="true" />
            {t(error)}
          </p>
        )}
        <button className="bk-primary" type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={18} className="bk-spin" aria-hidden="true" />
              {t("Входим…")}
            </>
          ) : (
            <>
              {t("Войти")}
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      <div className="bk-divider">
        <span>{t("Всё ещё впереди")}</span>
      </div>
      <p className="bk-switch">
        {t("Ещё нет аккаунта?")}{" "}
        <Link to={authLink("/register", params)}>
          {t("Зарегистрироваться")}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </p>
      <p className="bk-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          {t(
            accountApiEnabled
              ? "Вход в серверный аккаунт BakeU."
              : "Демо-вход: аккаунт хранится только в этом браузере.",
          )}
        </span>
      </p>
    </AuthShell>
  );
}

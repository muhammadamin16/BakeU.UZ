import { accountApiEnabled } from "../../../bot/client/accountApi";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  TriangleAlert,
} from "lucide-react";

import { loginLocal } from "../../../store/localAccount";
import { isLoggedIn } from "../../../store/session";
import AuthShell from "../AuthShell";
import "../Auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoggedIn()) return <Navigate to="/profile" replace />;

  const update = (key) => (event) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setError("");
  };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    if (!EMAIL_RE.test(form.email.trim()) || !form.password) {
      setError("Введите корректную почту и пароль.");
      return;
    }

    setBusy(true);
    try {
      await loginLocal(form.email.trim(), form.password);
      navigate("/profile", { replace: true });
    } catch (e) {
      setError(e.message || "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <header className="bk-head">
        <h1>С возвращением</h1>
        <p>Войдите, чтобы продолжить покупки и управлять профилем.</p>
      </header>

      <form className="bk-form" onSubmit={submit} noValidate>
        <div className="bk-field">
          <label htmlFor="login-email">Электронная почта</label>
          <div className="bk-input">
            <Mail size={18} />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="example@gmail.com"
              value={form.email}
              onChange={update("email")}
              aria-invalid={Boolean(error)}
              required
            />
          </div>
        </div>

        <div className="bk-field">
          <label htmlFor="login-password">Пароль</label>
          <div className="bk-input">
            <LockKeyhole size={18} />
            <input
              id="login-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Введите пароль"
              value={form.password}
              onChange={update("password")}
              aria-invalid={Boolean(error)}
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
          <p className="bk-alert" role="alert">
            <TriangleAlert size={16} />
            {error}
          </p>
        )}

        <button className="bk-primary" type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={18} className="bk-spin" /> Входим…
            </>
          ) : (
            <>
              Войти <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="bk-switch">
        Ещё нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
      <p className="bk-note">
        {accountApiEnabled
          ? "Вход в серверный аккаунт BakeU."
          : "Демо-вход: аккаунт хранится только в этом браузере."}
      </p>
    </AuthShell>
  );
}

import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Eye,
  EyeOff,
  // LockKeyRound,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Store,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import { isEmail, loginUser } from "../../../utils/auth";
import "./Login.css";

const features = [
  {
    icon: ShoppingBag,
    title: "Любимые десерты",
    description: "Выпечка и сладости в одном месте",
  },
  {
    icon: Store,
    title: "Местные кондитеры",
    description: "Откройте новые любимые магазины",
  },
  {
    icon: CheckCircle2,
    title: "Простой заказ",
    description: "Выбирайте и заказывайте удобно",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const submitting = useRef(false);

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  function change(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;

    const nextErrors = {};
    if (!form.email.trim()) {
      nextErrors.email = "Введите электронную почту";
    } else if (!isEmail(form.email.trim())) {
      nextErrors.email = "Укажите корректный email";
    }
    if (!form.password) {
      nextErrors.password = "Введите пароль";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitting.current = true;
    setLoading(true);
    setServerError("");

    try {
      await loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate("/profile", { replace: true });
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Не удалось войти. Попробуйте снова."
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="bakeu-login-page">
      <div className="bakeu-login-layout">
        {/* ===== LEFT BRAND SIDE ===== */}
        <aside className="bakeu-login-brand" aria-label="О BakeU">
          <div className="bakeu-login-brand-top">
            <Link
              className="bakeu-login-brand-logo"
              to="/"
              aria-label="BakeU — главная"
            >
              <span className="bakeu-login-symbol">
                <ChefHat size={24} strokeWidth={1.8} />
              </span>
              <span>
                Bake<span className="bakeu-login-logo-u">U</span>
              </span>
            </Link>
            <span className="bakeu-login-tag">MARKETPLACE</span>
          </div>

          <div className="bakeu-login-brand-center">
            <div className="bakeu-login-eyebrow">
              <span /> ВАШ МИР ВКУСА
            </div>
            <h2>
              Вкусные моменты
              <br />
              <em>начинаются здесь.</em>
            </h2>
            <p className="bakeu-login-brand-copy">
              Домашняя выпечка, авторские десерты и талантливые кондитеры — всё
              в одном месте.
            </p>

            <div className="bakeu-login-features">
              {features.map(({ icon: Icon, title, description }) => (
                <div className="bakeu-login-feature" key={title}>
                  <span className="bakeu-login-feature-icon">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>
                  <span className="bakeu-login-feature-copy">
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bakeu-login-brand-bottom">
            <span>© {new Date().getFullYear()} BakeU</span>
            <span>
              <ShieldCheck size={16} /> С заботой о каждом заказе
            </span>
          </div>
        </aside>

        {/* ===== RIGHT FORM SIDE ===== */}
        <main className="bakeu-login-panel">
          <div className="bakeu-login-content">
            <div className="bakeu-login-topbar">
              <Link to="/" className="bakeu-login-back">
                <ArrowLeft size={17} /> На главную
              </Link>
              <span className="bakeu-login-top-label">ЛИЧНЫЙ КАБИНЕТ</span>
            </div>

            <div className="bakeu-login-mobile-brand">
              <ChefHat size={23} /> BakeU
            </div>

            <header className="bakeu-login-heading">
              <span className="bakeu-login-kicker">С ВОЗВРАЩЕНИЕМ</span>
              <h1>Войдите в аккаунт</h1>
              <p>
                Рады видеть вас снова. Войдите, чтобы продолжить покупки и
                управлять заказами.
              </p>
            </header>

            <form
              className="bakeu-login-form"
              onSubmit={submit}
              noValidate
            >
              {serverError && (
                <div className="bakeu-login-alert" role="alert">
                  <AlertCircle size={18} />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Email */}
              <div className="bakeu-login-field">
                <label htmlFor="login-email">Электронная почта</label>
                <div
                  className={`bakeu-login-input ${
                    errors.email ? "is-invalid" : ""
                  }`}
                >
                  <Mail size={19} aria-hidden="true" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder="example@gmail.com"
                    value={form.email}
                    onChange={change}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email ? "login-email-error" : undefined
                    }
                  />
                </div>
                {errors.email && (
                  <small
                    id="login-email-error"
                    className="bakeu-login-error"
                    role="alert"
                  >
                    {errors.email}
                  </small>
                )}
              </div>

              {/* Password */}
              <div className="bakeu-login-field">
                <label htmlFor="login-password">Пароль</label>
                <div
                  className={`bakeu-login-input ${
                    errors.password ? "is-invalid" : ""
                  }`}
                >
                  {/* <LockKeyRound size={19} aria-hidden="true" /> */}
                  <input
                    id="login-password"
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Введите пароль"
                    value={form.password}
                    onChange={change}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "login-password-error" : undefined
                    }
                  />
                  <button
                    type="button"
                    className="bakeu-login-eye"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
                    aria-pressed={visible}
                  >
                    {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
                {errors.password && (
                  <small
                    id="login-password-error"
                    className="bakeu-login-error"
                    role="alert"
                  >
                    {errors.password}
                  </small>
                )}
              </div>

              <button
                className="bakeu-login-submit"
                type="submit"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="bakeu-login-spinner"
                      size={19}
                    />{" "}
                    Входим...
                  </>
                ) : (
                  <>
                    Войти в аккаунт <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>

            <div className="bakeu-login-divider">
              <span>Ещё нет аккаунта?</span>
            </div>

            <Link className="bakeu-login-create" to="/register">
              Создать аккаунт <ArrowRight size={17} />
            </Link>

            <p className="bakeu-login-note">
              Продолжая, вы принимаете правила использования платформы BakeU.
            </p>
          </div>

          <div className="bakeu-login-panel-footer">
            <ShieldCheck size={15} /> Ваши данные под вашим контролем
          </div>
        </main>
      </div>
    </div>
  );
}
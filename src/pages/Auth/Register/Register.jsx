import { useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  Store,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  Building2,
  Sparkles,
  ChefHat,
} from "lucide-react";
import { isEmail, isPhone, registerUser } from "../../../utils/auth";
import "./Register.css";

const ROLES = [
  {
    id: "customer",
    title: "Покупатель",
    description: "Выбирайте десерты и заказывайте любимую выпечку",
    icon: UserRound,
  },
  {
    id: "seller",
    title: "Продавец",
    description: "Размещайте товары и находите новых покупателей",
    icon: Store,
  },
];

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  phone: "+998",
  email: "",
  password: "",
  shopName: "",
};

function RegisterField({
  name,
  label,
  placeholder,
  type = "text",
  autoComplete,
  Icon = UserRound,
  value,
  error,
  onChange,
}) {
  const id = `register-${name}`;

  return (
    <div className="bakeu-register-field">
      <label htmlFor={id}>{label}</label>

      <div className={`bakeu-register-input ${error ? "is-invalid" : ""}`}>
        <Icon size={17} aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>

      {error && (
        <small id={`${id}-error`} className="bakeu-register-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submittingRef = useRef(false);

  const presetRole = ROLES.some((item) => item.id === searchParams.get("role"))
    ? searchParams.get("role")
    : "";

  const [role, setRole] = useState(presetRole);
  const [step, setStep] = useState(presetRole ? 2 : 1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
  };

  const validateForm = () => {
    const nextErrors = {};

    if (form.firstName.trim().length < 2) {
      nextErrors.firstName = "Введите имя (минимум 2 символа)";
    }
    if (form.lastName.trim().length < 2) {
      nextErrors.lastName = "Введите фамилию (минимум 2 символа)";
    }
    if (!isPhone(form.phone)) {
      nextErrors.phone = "Формат: +998 90 123 45 67";
    }
    if (!isEmail(form.email.trim())) {
      nextErrors.email = "Введите корректный email";
    }
    if (form.password.length < 8) {
      nextErrors.password = "Пароль должен содержать минимум 8 символов";
    }
    if (role === "seller" && !form.shopName.trim()) {
      nextErrors.shopName = "Введите название магазина";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current || !role) return;
    if (!validateForm()) return;

    submittingRef.current = true;
    setLoading(true);
    setServerError("");

    try {
      await registerUser({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        shopName: role === "seller" ? form.shopName.trim() : "",
        role,
      });

      navigate("/profile", { replace: true });
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Не удалось создать аккаунт. Попробуйте ещё раз."
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const goToNextStep = () => {
    if (!role) return;
    setStep(2);
    setServerError("");
  };

  const goToPreviousStep = () => {
    setStep(1);
    setServerError("");
    setErrors({});
  };

  return (
    <div className="bakeu-register-page">
      <div className="bakeu-register-layout">
        {/* ===== BRAND SIDE ===== */}
        <aside className="bakeu-register-brand" aria-label="О BakeU">
          <div className="bakeu-register-brand-top">
            <Link to="/" className="bakeu-register-brand-logo">
              <span className="bakeu-register-symbol">
                <ChefHat size={22} strokeWidth={1.8} />
              </span>
              <span>
                Bake<span className="bakeu-register-logo-u">U</span>
              </span>
            </Link>
            <span className="bakeu-register-tag">MARKETPLACE</span>
          </div>

          <div className="bakeu-register-brand-center">
            <span className="bakeu-register-eyebrow">
              <Sparkles size={14} />
              ПРИСОЕДИНЯЙТЕСЬ К НАМ
            </span>

            <h2>
              Ваше место
              <br />
              в мире
              <br />
              <em>вкуса.</em>
            </h2>

            <p>
              Станьте частью BakeU — пространства для любителей домашней
              выпечки и талантливых кондитеров.
            </p>

            <div className="bakeu-register-emoji-row" aria-hidden="true">
              <span>🍰</span>
              <span>🥐</span>
              <span>🧁</span>
            </div>
          </div>

          <div className="bakeu-register-brand-bottom">
            <ShieldCheck size={17} />
            <span>Создано для вашего удобства</span>
          </div>
        </aside>

        {/* ===== FORM SIDE ===== */}
        <main className="bakeu-register-panel">
          <div className="bakeu-register-content">
            <Link to="/" className="bakeu-register-back">
              <ArrowLeft size={16} />
              На главную
            </Link>

            <div className="bakeu-register-mobile-brand">
              <ChefHat size={22} />
              <strong>BakeU</strong>
            </div>

            {/* Progress */}
            <div className="bakeu-register-progress">
              <div className="bakeu-register-progress-caption">
                <span>РЕГИСТРАЦИЯ</span>
                <span>ШАГ {step} ИЗ 2</span>
              </div>
              <div className="bakeu-register-progress-track">
                <span style={{ width: step === 1 ? "50%" : "100%" }} />
              </div>
            </div>

            {step === 1 ? (
              <>
                <header className="bakeu-register-heading">
                  <span className="bakeu-register-kicker">
                    НАЧНЁМ ЗНАКОМСТВО
                  </span>
                  <h1>Как вы хотите использовать BakeU?</h1>
                  <p>
                    Выберите подходящий тип аккаунта для начала работы.
                  </p>
                </header>

                <div
                  className="bakeu-register-roles"
                  role="group"
                  aria-label="Тип аккаунта"
                >
                  {ROLES.map((item) => {
                    const Icon = item.icon;
                    const selected = role === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`bakeu-register-role ${
                          selected ? "selected" : ""
                        }`}
                        onClick={() => setRole(item.id)}
                        aria-pressed={selected}
                      >
                        <span className="bakeu-register-role-icon">
                          <Icon size={23} />
                        </span>

                        <span className="bakeu-register-role-text">
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </span>

                        <span className="bakeu-register-role-check">
                          {selected && <Check size={14} />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="bakeu-register-submit"
                  disabled={!role}
                  onClick={goToNextStep}
                >
                  Продолжить
                  <ArrowRight size={19} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="bakeu-register-change-role"
                  onClick={goToPreviousStep}
                  disabled={loading}
                >
                  <ArrowLeft size={15} />
                  Изменить тип аккаунта
                </button>

                <header className="bakeu-register-heading">
                  <span className="bakeu-register-kicker">
                    СОЗДАНИЕ АККАУНТА
                  </span>
                  <h1>
                    {role === "seller"
                      ? "Аккаунт продавца"
                      : "Аккаунт покупателя"}
                  </h1>
                  <p>Заполните данные, чтобы начать пользоваться BakeU.</p>
                </header>

                <form
                  className="bakeu-register-form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  {serverError && (
                    <div className="bakeu-register-alert" role="alert">
                      <AlertCircle size={18} />
                      <span>{serverError}</span>
                    </div>
                  )}

                  <div className="bakeu-register-field-row">
                    <RegisterField
                      name="firstName"
                      label="Имя"
                      placeholder="Александр"
                      autoComplete="given-name"
                      value={form.firstName}
                      error={errors.firstName}
                      onChange={handleChange}
                    />
                    <RegisterField
                      name="lastName"
                      label="Фамилия"
                      placeholder="Иванов"
                      autoComplete="family-name"
                      value={form.lastName}
                      error={errors.lastName}
                      onChange={handleChange}
                    />
                  </div>

                  {role === "seller" && (
                    <RegisterField
                      name="shopName"
                      label="Название магазина"
                      placeholder="Sweet Bakery"
                      autoComplete="organization"
                      Icon={Building2}
                      value={form.shopName}
                      error={errors.shopName}
                      onChange={handleChange}
                    />
                  )}

                  <RegisterField
                    name="phone"
                    label="Номер телефона"
                    placeholder="+998 90 123 45 67"
                    type="tel"
                    autoComplete="tel"
                    Icon={Phone}
                    value={form.phone}
                    error={errors.phone}
                    onChange={handleChange}
                  />

                  <RegisterField
                    name="email"
                    label="Электронная почта"
                    placeholder="example@gmail.com"
                    type="email"
                    autoComplete="email"
                    Icon={Mail}
                    value={form.email}
                    error={errors.email}
                    onChange={handleChange}
                  />

                  {/* Password field */}
                  <div className="bakeu-register-field">
                    <label htmlFor="register-password">Пароль</label>
                    <div
                      className={`bakeu-register-input ${
                        errors.password ? "is-invalid" : ""
                      }`}
                    >
                      <LockKeyhole size={17} aria-hidden="true" />
                      <input
                        id="register-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Минимум 8 символов"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={
                          errors.password
                            ? "register-password-error"
                            : undefined
                        }
                      />
                      <button
                        type="button"
                        className="bakeu-register-eye"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Скрыть пароль" : "Показать пароль"
                        }
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <small
                        id="register-password-error"
                        className="bakeu-register-error"
                        role="alert"
                      >
                        {errors.password}
                      </small>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="bakeu-register-submit"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle
                          size={19}
                          className="bakeu-register-spinner"
                        />
                        Создаём аккаунт....
                      </>
                    ) : (
                      <>
                        Создать аккаунт
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            <p className="bakeu-register-switch">
              Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>

            <p className="bakeu-register-note">
              Создавая аккаунт, вы принимаете правила использования платформы
              BakeU.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
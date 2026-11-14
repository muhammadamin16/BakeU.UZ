import { registerLocal } from "../../../store/localAccount";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChefHat,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
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

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}) {
  return (
    <label className="ba-field">
      <span>{label}</span>
      <div className="ba-input">
        <Icon size={18} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
      </div>
    </label>
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError("Введите корректный email.");
    if (form.password.length < 8)
      return setError("Пароль должен содержать минимум 8 символов.");
    if (role === "seller" && (!form.company.trim() || !form.location.trim()))
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
    <main className="ba-page">
      <div className="ba-container">
        <div className="ba-heading">
          <span className="ba-eyebrow">
            <Sparkles size={15} /> BAKEU ACCOUNT
          </span>
          <h1>
            Станьте частью <em>BakeU</em>
          </h1>
          <p>
            Демо: создайте локальный аккаунт покупателя или продавца в этом
            браузере.
          </p>
        </div>
        <div className="ba-layout">
          <aside className="ba-promo">
            <div className="ba-brand">
              <ChefHat size={28} />
            </div>
            <span className="ba-promo-tag">ПРИСОЕДИНЯЙТЕСЬ К НАМ</span>
            <h2>Ваше место в мире вкусных идей.</h2>
            <p>
              Покупайте свежую выпечку или предлагайте собственные товары
              тысячам будущих клиентов.
            </p>
            <div className="ba-promo-points">
              <span>
                <ShoppingBag size={18} /> Удобные покупки
              </span>
              <span>
                <Store size={18} /> Личный магазин
              </span>
              <span>
                <Sparkles size={18} /> Простое управление
              </span>
            </div>
            <div className="ba-promo-foot">BakeU — вместе вкуснее.</div>
          </aside>
          <section className="ba-card">
            {step === 1 ? (
              <>
                <div className="ba-card-head">
                  <span className="ba-step">ШАГ 1 ИЗ 2</span>
                  <h2>Выберите тип аккаунта</h2>
                  <p>Как вы планируете использовать BakeU?</p>
                </div>
                <div className="ba-roles">
                  <button
                    type="button"
                    className={`ba-role ${role === "client" ? "selected" : ""}`}
                    onClick={() => setRole("client")}
                  >
                    <span className="ba-role-icon">
                      <ShoppingBag size={23} />
                    </span>
                    <span className="ba-role-text">
                      <strong>Покупатель</strong>
                      <small>Покупайте товары и находите любимые рецепты</small>
                    </span>
                    <span className="ba-radio" />
                  </button>
                  <button
                    type="button"
                    className={`ba-role ${role === "seller" ? "selected" : ""}`}
                    onClick={() => setRole("seller")}
                  >
                    <span className="ba-role-icon">
                      <Store size={23} />
                    </span>
                    <span className="ba-role-text">
                      <strong>Продавец</strong>
                      <small>
                        Создайте страницу магазина и продавайте товары
                      </small>
                    </span>
                    <span className="ba-radio" />
                  </button>
                </div>
                <button
                  className="ba-primary"
                  type="button"
                  onClick={() => setStep(2)}
                >
                  Продолжить <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <>
                <div className="ba-card-head">
                  <button
                    className="ba-back"
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                  >
                    <ArrowLeft size={16} /> Назад к выбору
                  </button>
                  <span className="ba-step">
                    ШАГ 2 ИЗ 2 · {role === "seller" ? "ПРОДАВЕЦ" : "ПОКУПАТЕЛЬ"}
                  </span>
                  <h2>Создать аккаунт</h2>
                  <p>
                    {role === "seller"
                      ? "Расскажите о себе и своём магазине."
                      : "Заполните данные для регистрации."}
                  </p>
                </div>
                <form className="ba-form" onSubmit={submit} noValidate>
                  <div className="ba-two">
                    <Field
                      label="Имя"
                      icon={UserRound}
                      value={form.firstName}
                      onChange={(v) => update("firstName", v)}
                      placeholder="Ваше имя"
                      autoComplete="given-name"
                    />
                    <Field
                      label="Фамилия"
                      icon={UserRound}
                      value={form.lastName}
                      onChange={(v) => update("lastName", v)}
                      placeholder="Ваша фамилия"
                      autoComplete="family-name"
                    />
                  </div>
                  <Field
                    label="Электронная почта"
                    icon={Mail}
                    type="email"
                    value={form.email}
                    onChange={(v) => update("email", v)}
                    placeholder="example@gmail.com"
                    autoComplete="email"
                  />
                  <Field
                    label="Номер телефона"
                    icon={Phone}
                    type="tel"
                    value={form.phone}
                    onChange={(v) => update("phone", v)}
                    placeholder="+998 90 123 45 67"
                    autoComplete="tel"
                  />
                  {role === "seller" && (
                    <>
                      <Field
                        label="Название компании / магазина"
                        icon={Building2}
                        value={form.company}
                        onChange={(v) => update("company", v)}
                        placeholder="Например, Sweet Bakery"
                      />
                      <Field
                        label="Местоположение"
                        icon={MapPin}
                        value={form.location}
                        onChange={(v) => update("location", v)}
                        placeholder="Город, район или адрес"
                      />
                    </>
                  )}
                  <label className="ba-field">
                    <span>Пароль</span>
                    <div className="ba-input">
                      <LockKeyhole size={18} />
                      <input
                        type={visible ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Минимум 8 символов"
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="ba-eye"
                        onClick={() => setVisible((v) => !v)}
                        aria-label={
                          visible ? "Скрыть пароль" : "Показать пароль"
                        }
                      >
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  <p className="ba-hint">
                    Демо-режим: пароль не сохраняется и не отправляется на
                    сервер.
                  </p>
                  {error && (
                    <p className="ba-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="ba-primary" type="submit" disabled={busy}>
                    Создать демо-профиль <ArrowRight size={18} />
                  </button>
                </form>
              </>
            )}
            <p className="ba-switch">
              Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

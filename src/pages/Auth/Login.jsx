import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChefHat, Mail, LockKeyhole, Eye, EyeOff, ArrowRight, ShoppingBag, Store, Sparkles } from "lucide-react";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.password) {
      setError("Введите корректную почту и пароль.");
      return;
    }
    // TODO: Replace with POST /auth/login and store a secure server session.
    setError("Демо-режим: вход станет доступен после подключения вашего backend API. Для просмотра профиля используйте регистрацию.");
  }

  return (
    <main className="ba-page"><div className="ba-container">
      <div className="ba-heading"><span className="ba-eyebrow"><Sparkles size={15}/> BAKEU ACCOUNT</span><h1>С возвращением в <em>BakeU</em></h1><p>Войдите, чтобы продолжить покупки и управлять своим профилем.</p></div>
      <div className="ba-layout">
        <aside className="ba-promo"><div className="ba-brand"><ChefHat size={28}/></div><span className="ba-promo-tag">BAKEU MARKETPLACE</span><h2>Вкусные идеи начинаются здесь.</h2><p>Открывайте рецепты, находите любимую выпечку и развивайте свой магазин.</p><div className="ba-promo-points"><span><ShoppingBag size={18}/> Покупайте с удовольствием</span><span><Store size={18}/> Продавайте с BakeU</span><span><Sparkles size={18}/> Вдохновляйтесь каждый день</span></div><div className="ba-promo-foot">BakeU — приготовлено с любовью.</div></aside>
        <section className="ba-card"><div className="ba-card-head"><span className="ba-step">ЛИЧНЫЙ КАБИНЕТ</span><h2>Вход в аккаунт</h2><p>Введите email и пароль для входа.</p></div>
          <form className="ba-form" onSubmit={submit} noValidate>
            <label className="ba-field"><span>Электронная почта</span><div className="ba-input"><Mail size={18}/><input type="email" autoComplete="email" placeholder="example@gmail.com" value={form.email} onChange={e => {setForm(f=>({...f,email:e.target.value}));setError("");}} required /></div></label>
            <label className="ba-field"><span>Пароль</span><div className="ba-input"><LockKeyhole size={18}/><input type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Введите пароль" value={form.password} onChange={e => {setForm(f=>({...f,password:e.target.value}));setError("");}} required /><button type="button" className="ba-eye" onClick={()=>setVisible(v=>!v)} aria-label={visible?"Скрыть пароль":"Показать пароль"}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
            {error && <p className="ba-error" role="alert">{error}</p>}
            <button className="ba-primary" type="submit">Войти <ArrowRight size={18}/></button>
          </form>
          <p className="ba-switch">Ещё нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
          <button className="ba-demo-link" type="button" onClick={()=>navigate("/register")}>Создать демо-профиль</button>
        </section>
      </div>
    </div></main>
  );
}

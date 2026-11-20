import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { goAccount } from "../../api/goAccount.js";
import AuthShell from "./AuthShell.jsx";
import "./GoPhoneAccount.css";

export default function GoPhoneAccount({ register = false }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState({ phone: "", name: "", email: "", password: "", role: "customer", marketName: "", address: "" });
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (pending) {
        if (Date.parse(pending.expiresAt) <= Date.now()) throw new Error("Код устарел. Запросите новый.");
        await goAccount.verifyPhone(pending.id, code);
        navigate("/account/orders", { replace: true });
      } else {
        const result = await goAccount.startPhone({ ...draft, purpose: register ? "register" : "login" });
        const url = new URL(result.telegramUrl);
        if (url.origin !== "https://t.me" || !/^[a-f0-9]{48}$/.test(result.id) || !Number.isFinite(Date.parse(result.expiresAt))) throw new Error("Сервер вернул неверную ссылку подтверждения.");
        setPending(result);
        setDraft((value) => ({ ...value, password: "" }));
      }
    } catch (failure) { setError(failure.message || "Не удалось подтвердить аккаунт."); }
    finally { setBusy(false); }
  }
  return <AuthShell><form className="go-phone-auth" onSubmit={submit}>
    <h1 id="bk-auth-title">{register ? "Создать аккаунт BakeU" : "Войти в BakeU"}</h1>
    <p>Подтвердите номер через Telegram. Аккаунт и заказы сохраняются на сервере.</p>
    {!pending ? <>
      <label>Номер телефона<input required type="tel" autoComplete="tel" maxLength={30} placeholder="+998 90 123 45 67" value={draft.phone} onChange={change("phone")} /></label>
      {register && <>
        <label>Имя и фамилия<input required autoComplete="name" minLength={2} maxLength={120} value={draft.name} onChange={change("name")} /></label>
        <label>Email<input required type="email" autoComplete="email" maxLength={254} value={draft.email} onChange={change("email")} /></label>
        <label>Пароль<input required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={draft.password} onChange={change("password")} /></label>
        <label>Тип аккаунта<select aria-label="Тип аккаунта" value={draft.role} onChange={change("role")}><option value="customer">Я покупатель</option><option value="seller">Я продавец</option></select></label>
        {draft.role === "seller" && <label>Название магазина<input required minLength={2} maxLength={120} value={draft.marketName} onChange={change("marketName")} /></label>}
        <label>Адрес (необязательно)<input autoComplete="street-address" maxLength={500} value={draft.address} onChange={change("address")} /></label>
      </>}
    </> : <>
      <a className="go-phone-link" href={pending.telegramUrl} target="_blank" rel="noopener noreferrer">Открыть Telegram и получить код ↗</a>
      <p>Нажмите «Поделиться своим номером» в боте и введите полученный код здесь.</p>
      <label>Код из Telegram<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label>
      <button type="button" disabled={busy} onClick={() => { setPending(null); setCode(""); setError(""); }}>Изменить данные / запросить новый код</button>
    </>}
    {error && <p className="go-phone-error" role="alert">{error}</p>}
    <button disabled={busy}>{busy ? "Подождите…" : pending ? "Подтвердить и войти" : "Получить код в Telegram"}</button>
    <Link to={register ? "/login" : "/register"}>{register ? "Уже есть подтверждённый аккаунт? Войти" : "Создать аккаунт"}</Link>
    <Link to="/account/orders">Вход в существующий Go-аккаунт по email</Link>
  </form></AuthShell>;
}

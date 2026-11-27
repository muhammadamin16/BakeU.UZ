import { lazy, Suspense, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { goAccount } from "../../api/goAccount.js";
import AuthShell from "./AuthShell.jsx";
import PhoneInput from "./PhoneInput.jsx";
import { phoneStartPayload, readPhonePending, savePhonePending, clearPhonePending } from "./phoneAccountForm.js";
import { useMiniApp } from "../../miniapp/context.js";
import { translateText as t } from "../../i18n/index.js";
import "./GoPhoneAccount.css";

const ShopLocationPicker = lazy(() => import("../../components/ShopLocationPicker/ShopLocationPicker.jsx"));

export default function GoPhoneAccount({ register = false }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const mini = useMiniApp();
  const purpose = register ? "register" : "login";
  const [draft, setDraft] = useState({ phone: "", firstName: "", lastName: "", role: "customer", marketName: "", address: "", lat: null, lng: null });
  const [pending, setPending] = useState(() => readPhonePending(purpose));
  const [step, setStep] = useState(() => pending ? 3 : register ? 1 : 2);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seller = draft.role === "seller";

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }
  const change = (key) => (event) => update(key, event.target.value);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (step === 1) {
      setStep(2);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (pending) {
        if (Date.parse(pending.expiresAt) <= Date.now()) throw Error("Код устарел. Запросите новый.");
        await goAccount.verifyPhone(pending.id, code);
        clearPhonePending(purpose);
        setPending(null);
        if (mini.isMiniMode) await mini.retry();
        const search = typeof state?.ordersSearch === "string"
          ? new URLSearchParams(state.ordersSearch)
          : new URLSearchParams();
        if (typeof state?.next === "string" && state.next.startsWith("/messages?")) {
          navigate(state.next, { replace: true });
          return;
        }
        navigate({ pathname: "/account/orders", search: search.toString() }, { replace: true });
      } else {
        const payload = phoneStartPayload(draft, register);
        const result = await goAccount.startPhone(payload);
        setPending(savePhonePending(purpose, result));
        setStep(3);
      }
    } catch (failure) {
      setError(failure.message || "Не удалось подтвердить аккаунт.");
    } finally {
      setBusy(false);
    }
  }

  if (!goAccount) return <AuthShell><div className="go-phone-auth"><h1 id="bk-auth-title">{t("Аккаунт BakeU")}</h1><p role="alert">{t("Вход и регистрация временно недоступны. Повторите позже.")}</p><Link to="/">{t("На главную")}</Link></div></AuthShell>;
  return (
    <AuthShell>
      <form className="go-phone-auth" onSubmit={submit}>
        <h1 id="bk-auth-title">{t(register ? "Создать аккаунт BakeU" : "Войти в BakeU")}</h1>
        {register && <p>{step} / 3 · {t(["Тип аккаунта", "Ваши данные", "Подтверждение Telegram"][step - 1])}</p>}
        <fieldset disabled={busy}>
          {step === 1 && (
            <label>{t("Тип аккаунта")}
              <select value={draft.role} onChange={change("role")}>
                <option value="customer">{t("Я покупатель")}</option>
                <option value="seller">{t("Я продавец")}</option>
              </select>
            </label>
          )}
          {step === 2 && <>
            {register && <>
              <label>{t("Имя")}<input required autoComplete="given-name" maxLength={80} value={draft.firstName} onChange={change("firstName")} /></label>
              <label>{t("Фамилия")}<input required autoComplete="family-name" maxLength={80} value={draft.lastName} onChange={change("lastName")} /></label>
            </>}
            <label htmlFor="go-auth-phone">{t("Телефон")}</label>
            {register
              ? <PhoneInput id="go-auth-phone" value={draft.phone} onChange={(value) => update("phone", value)} />
              : <input id="go-auth-phone" required type="tel" autoComplete="tel" maxLength={30} placeholder="+998 90 123 45 67" value={draft.phone} onChange={change("phone")} />}
            {register && seller && <>
              <label>{t("Название магазина")}<input required minLength={2} maxLength={150} autoComplete="organization" value={draft.marketName} onChange={change("marketName")} /></label>
              <Suspense fallback={<p role="status">{t("Загрузка карты…")}</p>}>
                <ShopLocationPicker id="go-register-address" value={draft} onChange={(location) => { setDraft(location); setError(""); }} />
              </Suspense>
              <p>{t("Магазин откроется сразу после подтверждения телефона. Дополнительная заявка не нужна.")}</p>
            </>}
            {register && <button type="button" onClick={() => { setStep(1); setError(""); }}>{t("Назад")}</button>}
          </>}
          {pending && <>
            <a className="go-phone-link" href={pending.telegramUrl} target="_blank" rel="noopener noreferrer">{t("Открыть Telegram и получить код")} ↗</a>
            <p>{t("Нажмите «Поделиться своим номером» в боте и введите полученный код здесь.")}</p>
            <label>{t("Код из Telegram")}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setError(""); }} /></label>
            <button type="button" onClick={() => { clearPhonePending(purpose); setPending(null); setStep(2); setCode(""); setError(""); }}>{t("Изменить данные / запросить новый код")}</button>
          </>}
        </fieldset>
        {register && step >= 2 && <p>{t("Аккаунт появится только после подтверждения вашего номера в Telegram.")}</p>}
        {error && <p className="go-phone-error" role="alert">{t(error)}</p>}
        <button disabled={busy}>{t(busy ? "Подождите…" : ["Продолжить", "Получить код в Telegram", "Подтвердить и войти"][step - 1])}</button>
        <Link to={register ? "/login" : "/register"} state={state}>{t(register ? "Уже есть подтверждённый аккаунт? Войти" : "Создать аккаунт")}</Link>
      </form>
    </AuthShell>
  );
}

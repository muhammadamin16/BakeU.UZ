import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { translateText as t } from "../../../i18n/index.js";
import { accountApiEnabled, startTelegramLogin, verifyTelegramLogin } from "../../../api/legacyAccounts";
import { authReturnTo, authLink } from "../../../store/navigation";
import { isLoggedIn } from "../../../store/session";
import AuthShell from "../AuthShell";
import PhoneInput from "../PhoneInput";
import PhoneVerification from "../PhoneVerification";
import PhoneAuthAlert from "../PhoneAuthAlert";
import { BOT_API_REQUIRED, readPhoneChallenge, savePhoneChallenge } from "../phoneChallenge";
import { completeUzPhone, uzPhoneDigits } from "../uzPhone";

const PENDING_KEY = "bakeu-telegram-pending-login";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = authReturnTo(params);
  const [pending, setPending] = useState(() => readPhoneChallenge(PENDING_KEY));
  const [phone, setPhone] = useState(() => uzPhoneDigits(pending?.phone));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoggedIn()) return <Navigate to={returnTo} replace />;

  async function submit(event) {
    event.preventDefault();
    const number = completeUzPhone(phone);
    if (busy) return;
    if (!number) return setError("Введите номер в формате +998 XX XXX XX XX.");
    if (!accountApiEnabled) return setError(BOT_API_REQUIRED);

    setBusy(true);
    setError("");
    try {
      const result = await startTelegramLogin(number);
      setPending(savePhoneChallenge(PENDING_KEY, result, { phone: number }));
    } catch (e) {
      setError(e.message || "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }

  async function verify(code) {
    setBusy(true);
    setError("");
    try {
      await verifyTelegramLogin(pending.token, code);
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
      {pending ? (
        <PhoneVerification
          botUrl={pending.botUrl}
          busy={busy}
          error={error}
          onVerify={verify}
          onCodeChange={() => setError("")}
          onEdit={() => {
            sessionStorage.removeItem(PENDING_KEY);
            setPending(null);
            setError("");
          }}
        />
      ) : (
        <>
          <header className="bk-head">
            <h1 id="bk-auth-title">{t("С возвращением")}</h1>
            <p>{t("Введите номер телефона, чтобы войти через Telegram.")}</p>
          </header>
          <form className="bk-form" onSubmit={submit} noValidate>
            <div className="bk-field">
              <label htmlFor="login-phone">{t("Телефон")}</label>
              <PhoneInput id="login-phone" value={phone} onChange={(value) => {
                setPhone(value);
                setError("");
              }} invalid={Boolean(error)} />
            </div>
            {error && <PhoneAuthAlert message={error} />}
            <button className="bk-primary" type="submit" disabled={busy}>
              {t("Отправить код")}
              {busy ? <Loader2 size={18} className="bk-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>
        </>
      )}
      <p className="bk-switch">
        {t("Ещё нет аккаунта?")}{" "}
        <Link to={authLink("/register", params)}>{t("Зарегистрироваться")}</Link>
      </p>
    </AuthShell>
  );
}

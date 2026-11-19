import { useState } from "react";
import { ArrowRight, Loader2, Send } from "lucide-react";
import { translateText as t } from "../../i18n/index.js";

export default function PhoneVerification({ botUrl, busy, error, onVerify, onEdit, onCodeChange }) {
  const [code, setCode] = useState("");
  return (
    <>
      <header className="bk-head">
        <h1 id="bk-auth-title">{t("Подтверждение телефона.")}</h1>
        <p>{t("Откройте Telegram, нажмите Start, поделитесь своим номером и введите код из бота.")}</p>
      </header>
      {botUrl && (
        <a href={botUrl} target="_blank" rel="noopener noreferrer" className="bk-telegram-open">
          <Send size={17} aria-hidden="true" /> {t("Открыть Telegram бот")}
        </a>
      )}
      <p className="bk-note">{t("После получения кода вернитесь сюда. Код действителен 10 минут.")}</p>
      <form className="bk-form" onSubmit={(event) => {
        event.preventDefault();
        if (!busy && code.length === 6) onVerify(code);
      }}>
        <div className="bk-field">
          <label htmlFor="auth-code">{t("Код из Telegram")}</label>
          <div className="bk-input">
            <input
              id="auth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="000000"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                onCodeChange();
              }}
              required
            />
          </div>
        </div>
        {error && <p className="bk-alert" role="alert">{t(error)}</p>}
        <button className="bk-primary" type="submit" disabled={busy || code.length !== 6}>
          {t("Подтвердить код")}
          {busy ? <Loader2 size={18} className="bk-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>
      <button className="bk-restart-registration" type="button" disabled={busy} onClick={onEdit}>
        {t("Изменить данные")}
      </button>
    </>
  );
}

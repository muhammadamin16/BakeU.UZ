import { ExternalLink } from "lucide-react";
import { translateText as t } from "../../i18n/index.js";

import { BOT_API_REQUIRED } from "./phoneChallenge";

const botUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim().replace(/^@/, "");
const botUrl = /^[a-zA-Z0-9_]{5,32}$/.test(botUsername) ? `https://t.me/${botUsername}` : "";

export default function PhoneAuthAlert({ message }) {
  return (
    <div className="bk-alert bk-field--wide bk-phone-alert" role="alert">
      <span>{t(message)}</span>
      {message === BOT_API_REQUIRED && botUrl && (
        <a href={botUrl} target="_blank" rel="noopener noreferrer">
          {t("Открыть Telegram бот")} <ExternalLink size={15} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

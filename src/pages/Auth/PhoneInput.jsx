import { Phone } from "lucide-react";

import { translateText } from "../../i18n/index.js";
import { formatUzPhone, uzPhoneDigits } from "./uzPhone";

export default function PhoneInput({ id, value, onChange, invalid = false }) {
  return (
    <div className="bk-input bk-phone-input">
      <Phone size={18} aria-hidden="true" />
      <span className="bk-phone-country" aria-hidden="true">+998</span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatUzPhone(value)}
        onChange={(event) => onChange(uzPhoneDigits(event.target.value))}
        placeholder="** *** ** **"
        aria-label={translateText("Номер телефона без кода +998")}
        aria-invalid={invalid}
        required
      />
    </div>
  );
}

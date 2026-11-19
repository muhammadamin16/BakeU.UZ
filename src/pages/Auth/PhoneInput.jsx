import { Phone } from "lucide-react";
import { formatUzPhone, uzPhoneDigits } from "./uzPhone";

export default function PhoneInput({ id, value, onChange, invalid = false }) {
  return (
    <div className="bk-input bk-phone-input">
      <Phone size={18} aria-hidden="true" />
      <span className="bk-phone-country" aria-label="Узбекистан">
        <span aria-hidden="true">🇺🇿</span> +998
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatUzPhone(value)}
        onChange={(event) => onChange(uzPhoneDigits(event.target.value))}
        placeholder="** *** ** **"
        maxLength={12}
        aria-label="Номер телефона без кода +998"
        aria-invalid={invalid}
        required
      />
    </div>
  );
}

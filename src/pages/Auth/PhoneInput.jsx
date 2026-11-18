import { Phone } from "lucide-react";

// Keep the Uzbekistan country code fixed; accept local digits or pasted +998 numbers.
export function uzPhoneDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length > 9) digits = digits.slice(3);
  return digits.slice(0, 9);
}

export function formatUzPhone(value) {
  const digits = uzPhoneDigits(value);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean).join(" ");
}

export function completeUzPhone(value) {
  const digits = uzPhoneDigits(value);
  return digits.length === 9 ? `998${digits}` : "";
}

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

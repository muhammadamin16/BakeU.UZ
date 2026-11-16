import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { translateText as t } from "../../i18n/index.js";

export default function AuthField({
  id,
  name,
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  error,
  hint,
  inputMode,
  disabled,
  maxLength,
  minLength,
}) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={`bk-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{t(label)}</label>
      <div className="bk-input">
        <Icon size={18} aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={password && visible ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(placeholder)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required
        />
        {password && (
          <button
            type="button"
            className="bk-eye"
            onClick={() => setVisible((v) => !v)}
            aria-label={t(visible ? "Скрыть пароль" : "Показать пароль")}
            aria-pressed={visible}
            aria-controls={id}
          >
            {visible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && (
        <span className="bk-field-error" id={`${id}-error`}>
          {t(error)}
        </span>
      )}
      {hint && (
        <small className="bk-field-hint" id={`${id}-hint`}>
          {t(hint)}
        </small>
      )}
    </div>
  );
}

import { translateText } from "../../i18n/index.js";
import { useState } from "react";
import { readAdminPicture } from "../utils/images";
import ProductPhoto from "./ProductPhoto";

export default function ImageField({
  id,
  label,
  value,
  onChange,
  onBusy,
  disabled,
}) {
  const [error, setError] = useState("");
  return (
    <div className="ad-image-field">
      <ProductPhoto src={value} alt={translateText("Предпросмотр фото")} />
      <div>
        <input
          id={id}
          disabled={disabled}
          aria-label={translateText(label)}
          placeholder={translateText("/images/... или https://...")}
          value={value || ""}
          onChange={(event) => {
            setError("");
            onChange(event.target.value);
          }}
        />
        <label className="ad-upload-label" htmlFor={`${id}-upload`}>
          {translateText("Загрузить с компьютера")}
        </label>
        <input
          id={`${id}-upload`}
          disabled={disabled}
          aria-label={translateText("Загрузить фото товара")}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            onBusy(true);
            setError("");
            try {
              onChange(await readAdminPicture(file));
            } catch (failure) {
              setError(failure.message || "Не удалось открыть фото");
            } finally {
              onBusy(false);
              event.target.value = "";
            }
          }}
        />
        {value && (
          <button
            type="button"
            disabled={disabled}
            className="ad-btn small"
            onClick={() => onChange("")}
          >
            {translateText("Убрать фото")}
          </button>
        )}
        {error && (
          <p role="alert" className="ad-form-error">
            {translateText(error)}
          </p>
        )}
      </div>
    </div>
  );
}

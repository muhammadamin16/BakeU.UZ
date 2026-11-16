import { translateText } from "../../i18n/index.js";
import { useState } from "react";

export default function ProductImage({ src, name = "Товар" }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div
        className="bu-image bu-placeholder"
        role="img"
        aria-label={translateText(name)}
      >
        {translateText("Фото товара")}
      </div>
    );
  }

  return (
    <img
      className="bu-image"
      src={src}
      alt={translateText(name)}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}

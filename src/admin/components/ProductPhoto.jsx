import { useState } from "react";
import { ImageOff } from "lucide-react";
import { safeProductImage } from "../utils/images";

function Photo({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className={`ad-product-photo ${className}`}
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className={`ad-product-photo ad-product-photo-empty ${className}`}
      role="img"
      aria-label={`${alt || "Товар"}: нет фото`}
    >
      <ImageOff size={22} />
      <small>Нет фото</small>
    </span>
  );
}

export default function ProductPhoto({
  src,
  alt = "Фото товара",
  className = "",
}) {
  const safe = safeProductImage(src);
  return <Photo key={safe} src={safe} alt={alt} className={className} />;
}

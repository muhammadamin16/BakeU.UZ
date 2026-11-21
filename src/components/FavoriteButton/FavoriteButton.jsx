import { translateText } from "../../i18n/index.js";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import { useFavoriteStore } from "../../store/favoriteStore";
import "./FavoriteButton.css";
export default function FavoriteButton({ product }) {
  const saved = useFavoriteStore((s) => Boolean(s.items[product.productId || product.id]));
  const toggle = useFavoriteStore((s) => s.toggle);
  const load = useFavoriteStore((s) => s.load);
  const busy = useFavoriteStore((s) => s.busy);
  const error = useFavoriteStore((s) => s.error);
  useEffect(() => { void load(); }, [load]);
  return (
    <button
      type="button"
      disabled={busy}
      title={translateText(error || "Избранное")}
      className="bakeu-save-product"
      aria-pressed={saved}
      aria-label={translateText(
        `${saved ? "Убрать из избранного" : "В избранное"}: ${product.name}`,
      )}
      onClick={() => toggle(product)}
    >
      <Heart size={20} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

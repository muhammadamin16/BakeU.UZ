import { Heart } from "lucide-react";
import { useFavoriteStore } from "../../store/favoriteStore";
import "./FavoriteButton.css";
export default function FavoriteButton({ product }) {
  const saved = useFavoriteStore(s => Boolean(s.items[product.id]));
  const toggle = useFavoriteStore(s => s.toggle);
  return <button type="button" className="bakeu-save-product" aria-pressed={saved}
    aria-label={`${saved ? "Убрать из избранного" : "В избранное"}: ${product.name}`}
    onClick={() => toggle(product)}><Heart size={20} fill={saved ? "currentColor" : "none"}/></button>;
}

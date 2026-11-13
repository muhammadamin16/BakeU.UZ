import { ShoppingBag } from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import FavoriteButton from "../FavoriteButton/FavoriteButton";
export default function ProductActions({ product }) {
  const add = useCartStore(s => s.add);
  const quantity = useCartStore(s => s.items[product.id] || 0);
  return <div className="bu-product-actions"><button type="button" className="bu-button" onClick={() => add(product)}>
    <ShoppingBag size={18}/>{quantity ? `В корзине: ${quantity} · +1` : "В корзину"}
    </button><FavoriteButton product={product}/></div>;
}

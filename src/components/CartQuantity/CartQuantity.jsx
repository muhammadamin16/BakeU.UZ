import { useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { translateText } from "../../i18n/index.js";
import { useCartStore } from "../../store/cartStore";
import "./CartQuantity.css";

export default function CartQuantity({ product, quantity, onAdd }) {
  const decrease = useCartStore((state) => state.decrease);
  const addRef = useRef(null);
  const hasQuantity = quantity > 0;

  return (
    <div className="cart-quantity">
      {hasQuantity && (
        <>
          <button
            type="button"
            aria-label={translateText(`Уменьшить количество: ${product.name}`)}
            onClick={() => {
              if (quantity === 1) addRef.current?.focus();
              decrease(product.id);
            }}
          >
            <Minus size={17} aria-hidden="true" />
          </button>
          <output aria-label={translateText("В корзине:")}>{quantity}</output>
        </>
      )}
      <button
        ref={addRef}
        type="button"
        disabled={!onAdd}
        onClick={() => onAdd(product)}
        aria-label={translateText(
          hasQuantity
            ? `Увеличить количество: ${product.name}`
            : `Добавить в корзину: ${product.name}`,
        )}
      >
        <Plus size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

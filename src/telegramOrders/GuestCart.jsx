import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore.js";

export default function GuestCart({ title = "Гостевая корзина" }) {
  const items = useCartStore((state) => state.items);
  const products = useCartStore((state) => state.products);
  const increase = useCartStore((state) => state.increase);
  const decrease = useCartStore((state) => state.decrease);
  const remove = useCartStore((state) => state.remove);
  const entries = Object.entries(items);
  return (
    <section className="tg-orders-panel" aria-label={title}>
      <h2>{title}</h2>
      {entries.length === 0 ? <p>Корзина пуста.</p> : (
        <ul>{entries.map(([id, qty]) => (
          <li key={id}>
            {products[id]?.name || "Товар"}{products[id]?.variantLabel ? ` · ${products[id].variantLabel}` : ""} × {qty}
            {" "}<button type="button" disabled={qty <= 1} onClick={() => decrease(id)}>Уменьшить</button>
            {" "}<button type="button" disabled={qty >= 1000} onClick={() => increase(id)}>Увеличить</button>
            {" "}<button type="button" onClick={() => remove(id)}>Убрать</button>
          </li>
        ))}</ul>
      )}
      <Link to="/seller">Продолжить покупки</Link>
    </section>
  );
}

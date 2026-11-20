import { translateText } from "../../i18n/index.js";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import ProductImage from "../../components/ProductImage/ProductImage";
import "./Cart.css";
const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " сум";
export default function Cart() {
  const { items, products, increase, decrease, remove, clear } = useCartStore();
  const rows = Object.entries(items);
  const total = rows.reduce(
    (sum, [id, qty]) => sum + (products[id]?.price ?? 0) * qty,
    0,
  );
  return (
    <main className="bu-shopping bu-cart">
      <div className="bu-heading">
        <h1>{translateText("Корзина")}</h1>
        {rows.length > 0 && (
          <button className="bu-text" onClick={clear}>
            {translateText("Очистить")}
          </button>
        )}
      </div>
      {!rows.length ? (
        <div className="bu-empty">
          <h2>{translateText("В корзине пока пусто")}</h2>
          <p>{translateText("Добавьте любимую выпечку из каталога.")}</p>
          <Link className="bu-button" to="/">
            {translateText("Перейти к покупкам")}
          </Link>
        </div>
      ) : (
        <div className="bu-cart-layout">
          <div className="bu-rows">
            {rows.map(([id, qty]) => {
              const p = products[id];
              if (!p)
                return (
                  <article className="bu-row" key={id}>
                    <div className="bu-row-info">
                      <h2>{translateText("Товар недоступен")}</h2>
                      <p>
                        {translateText(
                          "Добавьте товар заново из каталога. Он не включён в итог.",
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="bu-icon"
                      aria-label={translateText("Удалить недоступный товар")}
                      onClick={() => remove(id)}
                    >
                      <Trash2 size={19} />
                    </button>
                  </article>
                );
              return (
                <article className="bu-row" key={id}>
                  <ProductImage src={p.image} name={p.name} />
                  <div className="bu-row-info">
                    <h2>
                      <Link
                        to={
                          "/product/" + encodeURIComponent(p.productId || p.id)
                        }
                      >
                        {translateText(p.name)}
                      </Link>
                    </h2>
                    {p.variantLabel && <p>{translateText(p.variantLabel)}</p>}
                    <p>
                      {translateText(money(p.price))} /{" "}
                      {translateText(p.unit || "шт.")}
                    </p>
                    <div className="bu-quantity">
                      <button
                        aria-label={translateText(
                          `Уменьшить количество: ${p.name}`,
                        )}
                        onClick={() => decrease(id)}
                      >
                        <Minus size={16} />
                      </button>
                      <span>{translateText(qty)}</span>
                      <button
                        aria-label={translateText(
                          `Увеличить количество: ${p.name}`,
                        )}
                        onClick={() => increase(id)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="bu-row-end">
                    <strong>{translateText(money(p.price * qty))}</strong>
                    <button
                      className="bu-icon"
                      aria-label={translateText(`Удалить. ${p.name}`)}
                      onClick={() => remove(id)}
                    >
                      <Trash2 size={19} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="bu-total">
            <h2>{translateText("Ваш заказ")}</h2>
            <p>
              {translateText("Товаров: ")}
              {translateText(rows.reduce((n, [, q]) => n + q, 0))}
            </p>
            <div>
              <span>{translateText("Итого")}</span>
              <strong>{translateText(money(total))}</strong>
            </div>
            <Link className="bu-button" to="/checkout">
              {translateText("Перейти к оформлению")}
            </Link>
            <p className="bu-checkout-hint">
              {translateText(
                "Телефоны продавцов и согласование времени — на следующем шаге.",
              )}
            </p>
            <Link className="bu-continue" to="/">
              {translateText("Продолжить покупки")}
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}

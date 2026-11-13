import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import ProductImage from "../../components/ProductImage/ProductImage";
import "./Cart.css"
const money = n => new Intl.NumberFormat("ru-RU").format(n) + " сум";
export default function Cart() {
  const { items, products, increase, decrease, remove, clear } = useCartStore();
  const rows = Object.entries(items);
  const total = rows.reduce((sum,[id,qty]) => sum + (products[id]?.price ?? 0) * qty, 0);
  return <main className="bu-shopping">
    <div className="bu-heading"><h1>Корзина</h1>{rows.length > 0 && <button className="bu-text" onClick={clear}>Очистить</button>}</div>
    {!rows.length ? <div className="bu-empty"><h2>В корзине пока пусто</h2><p>Добавьте любимую выпечку из каталога.</p><Link className="bu-button" to="/">Перейти к покупкам</Link></div> :
      <div className="bu-cart-layout"><div className="bu-rows">{rows.map(([id,qty]) => {
        const p = products[id];
        if (!p) return <article className="bu-row" key={id}><div className="bu-row-info"><h2>Товар недоступен</h2><p>Добавьте товар заново из каталога. Он не включён в итог.</p></div><button type="button" className="bu-icon" aria-label="Удалить недоступный товар" onClick={() => remove(id)}><Trash2 size={19}/></button></article>;
        return <article className="bu-row" key={id}>
          <ProductImage src={p.image} name={p.name} />
          <div className="bu-row-info"><h2>{p.name}</h2><p>{money(p.price)} / шт.</p>
            <div className="bu-quantity"><button aria-label={`Уменьшить количество: ${p.name}`} onClick={() => decrease(id)}><Minus size={16}/></button><span>{qty}</span><button aria-label={`Увеличить количество: ${p.name}`} onClick={() => increase(id)}><Plus size={16}/></button></div>
          </div>
          <div className="bu-row-end"><strong>{money(p.price * qty)}</strong><button className="bu-icon" aria-label={`Удалить ${p.name}`} onClick={() => remove(id)}><Trash2 size={19}/></button></div>
        </article>;
      })}</div><aside className="bu-total"><h2>Ваш заказ</h2><p>Товаров: {rows.reduce((n,[,q]) => n+q,0)}</p><div><span>Итого</span><strong>{money(total)}</strong></div><Link className="bu-button" to="/">Продолжить покупки</Link></aside></div>}
  </main>;
}

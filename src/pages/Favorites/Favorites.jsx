import { Link } from "react-router-dom";
import { useFavoriteStore } from "../../store/favoriteStore";
import ProductActions from "../../components/ProductActions/ProductActions";
import ProductImage from "../../components/ProductImage/ProductImage";
import "./Favorites.css";
export default function Favorites() {
  const items = useFavoriteStore((s) => s.items);
  const clear = useFavoriteStore((s) => s.clear);
  const products = Object.values(items);
  return (
    <main className="bu-shopping">
      <div className="bu-heading">
        <h1>Избранное</h1>
        {products.length > 0 && (
          <button className="bu-text" onClick={clear}>
            Очистить
          </button>
        )}
      </div>
      {!products.length ? (
        <div className="bu-empty">
          <h2>Сохраните то, что нравится</h2>
          <p>Нажмите сердечко на карточке товара.</p>
          <Link to="/" className="bu-button">
            Открыть каталог
          </Link>
        </div>
      ) : (
        <div className="bu-grid">
          {products.map((p) => (
            <article className="bu-card" key={p.id}>
              <Link to={"/product/" + encodeURIComponent(p.productId || p.id)}>
                <ProductImage src={p.image} name={p.name} />
                <h2>{p.name}</h2>
              </Link>
              <p>{new Intl.NumberFormat("ru-RU").format(p.price)} сум</p>
              <ProductActions product={p} />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

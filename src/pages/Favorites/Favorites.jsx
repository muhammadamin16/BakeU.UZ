import { translateText } from "../../i18n/index.js";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useFavoriteStore } from "../../store/favoriteStore";
import { useCartStore } from "../../store/cartStore";
import { usePublicCatalog } from "../../api/usePublicCatalog.js";
import { ProductCard } from "../Seller/SellerParts";
import "./Favorites.css";
export default function Favorites() {
  const items = useFavoriteStore((s) => s.items);
  const clear = useFavoriteStore((s) => s.clear);
  const load = useFavoriteStore((s) => s.load);
  const remove = useFavoriteStore((s) => s.remove);
  const error = useFavoriteStore((s) => s.error);
  const busy = useFavoriteStore((s) => s.busy);
  useEffect(() => { void load(); }, [load]);
  const cartItems = useCartStore((s) => s.items);
  const add = useCartStore((s) => s.add);
  const { products, shops, catalogError } = usePublicCatalog();
  const productsById = new Map(products.map((product) => [String(product.id), product]));
  const shopsById = new Map(shops.map((shop) => [String(shop.id), shop]));
  const favorites = Object.values(items);
  return (
    <main className="bu-shopping">
      <div className="bu-heading">
        <h1>{translateText("Избранное")}</h1>
        {favorites.length > 0 && (
          <button className="bu-text" disabled={busy} onClick={clear}>
            {translateText("Очистить")}
          </button>
        )}
      </div>
      {(error || catalogError) && <p role="status">{translateText(error || catalogError)}</p>}
      <button className="bu-text" disabled={busy} onClick={load}>{translateText("Обновить")}</button>
      {!favorites.length ? (
        <div className="bu-empty">
          <h2>{translateText("Сохраните то, что нравится")}</h2>
          <p>{translateText("Нажмите сердечко на карточке товара.")}</p>
          <Link to="/" className="bu-button">
            {translateText("Открыть каталог")}
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {favorites.map((saved) => {
            const current = productsById.get(String(saved.productId || saved.id));
            if (!current) return <article className="catalog-card" key={saved.id}><p>{translateText("Товар недоступен.")}</p><button disabled={busy} onClick={() => remove(saved.id)}>{translateText("Убрать из избранного")}</button></article>;
            const product = {
              ...saved,
              ...current,
            };
            return (
              <ProductCard
                key={saved.id}
                product={product}
                shop={shopsById.get(String(product.shopId))}
                quantity={cartItems[saved.id] ?? 0}
                onAdd={add}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

import { translateText } from "../../i18n/index.js";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Store, Star, ArrowUpRight, Plus } from "lucide-react";
import { products, getShop } from "../../store/sellerData";

import { formatPrice, shopUrl } from "./format";

export function ShopLogo({ shop }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="seller-shop__logo"
      style={{ "--shop-color": shop.color }}
      aria-hidden="true"
    >
      {shop.logo && !failed ? (
        <img src={shop.logo} alt="" onError={() => setFailed(true)} />
      ) : (
        shop.initials
      )}
    </span>
  );
}

export function ShopRating({ shop }) {
  return (
    <div className="seller-shop__rating">
      <Star size={14} fill="currentColor" aria-hidden="true" />
      <strong>{translateText(shop.rating)}</strong>
      <span>
        {translateText("Оценок: ")}
        {translateText(shop.reviewsCount)}
      </span>
    </div>
  );
}

export function ProductCard({ product, quantity, onAdd }) {
  const shop = getShop(product.shopId);
  return (
    <article className="seller-product">
      <div className="seller-product__image">
        <Link to={"/product/" + encodeURIComponent(product.id)}>
          <img
            src={product.image}
            alt={translateText(product.name)}
            loading="lazy"
            width="400"
            height="350"
          />
        </Link>
        <FavoriteButton product={product} />
        {quantity > 0 && (
          <span className="seller-product__count">
            {translateText("В корзине: ")}
            {quantity}
          </span>
        )}
      </div>
      <div className="seller-product__body">
        <Link
          to={"/seller" + shopUrl(product.shopId)}
          className="seller-product__shop"
        >
          <Store size={13} aria-hidden="true" />
          {translateText(shop?.name)}
        </Link>
        <h2>
          <Link to={"/product/" + encodeURIComponent(product.id)}>
            {translateText(product.name)}
          </Link>
        </h2>
        <div className="seller-product__bottom">
          <strong>{translateText(formatPrice(product.price))}</strong>
          <button
            type="button"
            className="seller-product__add"
            onClick={() => onAdd(product)}
            aria-label={translateText(`Добавить в корзину: ${product.name}`)}
          >
            <Plus size={21} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ShopCard({ shop }) {
  const shopProducts = products.filter((p) => p.shopId === shop.id);
  const review = shop.reviews[0];

  return (
    <article className="seller-shop">
      <Link to={shopUrl(shop.id)} className="seller-shop__top">
        <ShopLogo shop={shop} />
        <div className="seller-shop__identity">
          <h2>{translateText(shop.name)}</h2>
          <ShopRating shop={shop} />
        </div>
        <ArrowUpRight
          className="seller-shop__arrow"
          size={18}
          aria-hidden="true"
        />
      </Link>

      <p className="seller-shop__description">
        {translateText(shop.description)}
      </p>

      <div className="seller-shop__preview-heading">
        <span>{translateText("Витрина")}</span>
        <span>
          {translateText("Товаров: ")}
          {shopProducts.length}
        </span>
      </div>

      <div className="seller-shop__previews">
        {shopProducts.slice(0, 3).map((p) => (
          <Link
            key={p.id}
            to={"/product/" + encodeURIComponent(p.id)}
            className="seller-shop__preview"
          >
            <img src={p.image} alt="" loading="lazy" width="100" height="76" />
            <strong>{translateText(formatPrice(p.price))}</strong>
          </Link>
        ))}
      </div>

      {review && (
        <blockquote className="seller-shop__review">
          <p>«{review.text}»</p>
          <footer>
            {translateText(review.author)}
            {translateText(" · пример отзыва")}
          </footer>
        </blockquote>
      )}

      <Link to={shopUrl(shop.id)} className="seller-shop__open">
        {translateText("Открыть профиль")}
        <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

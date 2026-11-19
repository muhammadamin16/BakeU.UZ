import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ImageOff } from "lucide-react";
import { getLocale, translateText as t } from "../../i18n/index.js";
import CartQuantity from "../CartQuantity/CartQuantity";
import FavoriteButton from "../FavoriteButton/FavoriteButton";
import PhotoCarousel from "../PhotoCarousel/PhotoCarousel";
import "./ProductCard.css";

export function ProductImage({ product }) {
  const [failedImage, setFailedImage] = useState(null);
  const { image, name } = product;
  return image && image !== failedImage ? (
    <img src={image} alt={t(name)} loading="lazy" decoding="async" onError={() => setFailedImage(image)} />
  ) : (
    <span className="product-image-fallback" role="img" aria-label={t("Нет фото")}>
      <ImageOff size={24} aria-hidden="true" />
    </span>
  );
}

export default function ProductCard({ product, quantity = 0, onAdd, sellerName, sellerUrl }) {
  const productUrl = `/product/${encodeURIComponent(product.productId || product.id)}`;
  const seller = t(sellerName || product.sellerName || "BakeU");

  return (
    <article className="catalog-card product-card">
      <div className="catalog-card__media product-card__image">
        <PhotoCarousel
          product={product}
          renderImage={(image) => (
            <Link className="product-card__image-link" to={productUrl} aria-label={t(`Подробнее: ${product.name}`)}>
              <ProductImage product={{ image, name: product.name }} />
            </Link>
          )}
        >
          <div className="product-card__favorite"><FavoriteButton product={product} /></div>
          {quantity > 0 && (
            <span className="product-card__badge" aria-hidden="true">
              <Check size={13} /> {t("В корзине:")} {quantity}
            </span>
          )}
        </PhotoCarousel>
      </div>

      <div className="catalog-card__body product-card__body">
        <div className="product-card__meta">
          {sellerUrl ? <Link to={sellerUrl}>{seller}</Link> : <span>{seller}</span>}
          <span className="product-card__category">{t(product.category || "")}</span>
        </div>
        <h3 className="product-card__title"><Link to={productUrl}>{t(product.name)}</Link></h3>
        <div className="product-card__bottom">
          <span className="product-card__price">
            {Number(product.price || 0).toLocaleString(getLocale())} <small>{t("сум")}</small>
          </span>
          <CartQuantity product={product} quantity={quantity} onAdd={onAdd} />
        </div>
      </div>
    </article>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, ImageOff, Plus, Star, Store } from "lucide-react";
import { translateText } from "../../i18n/index.js";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import { products, getShop } from "../../store/sellerData";
import { formatPrice, shopUrl } from "./format";
import "./SellerParts.css";

const t = (value) => translateText(String(value ?? ""));
const productLink = (id) => `/product/${encodeURIComponent(String(id))}`;
const sellerLink = (id) => `/seller${shopUrl(id)}`;

function ProductImage({ product, className = "" }) {
  const [failed, setFailed] = useState(false);
  return product.image && !failed ? (
    <img className={className} src={product.image} alt={t(product.name)} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  ) : (
    <span className="sp-image-fallback" aria-label={t("Изображение недоступно")} role="img"><ImageOff size={26} /></span>
  );
}

export function ShopLogo({ shop }) {
  const [failed, setFailed] = useState(false);
  const initials = shop?.initials || String(shop?.name || "B").slice(0, 2).toUpperCase();
  return (
    <span className="seller-shop__logo" style={{ "--shop-color": shop?.color || "#dca978" }} aria-hidden="true">
      {shop?.logo && !failed ? <img src={shop.logo} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{initials}</span>}
    </span>
  );
}

export function ShopRating({ shop }) {
  const rating = Number(shop?.rating);
  return (
    <div className="seller-shop__rating">
      {Number.isFinite(rating) && rating > 0 ? <><Star size={14} fill="currentColor" aria-hidden="true" /><strong>{rating.toFixed(1)}</strong></> : <span>{t("Новый магазин")}</span>}
      {Number(shop?.reviewsCount) > 0 && <span className="seller-shop__rating-count">({Number(shop.reviewsCount)})</span>}
    </div>
  );
}

export function ProductCard({ product, quantity = 0, onAdd }) {
  const shop = getShop(product.shopId);
  const name = t(product.name);
  return (
    <article className="seller-product">
      <div className="seller-product__image">
        <Link to={productLink(product.id)} className="seller-product__image-link" aria-label={name}>
          <ProductImage product={product} />
        </Link>
        <div className="seller-product__favorite"><FavoriteButton product={product} /></div>
        {quantity > 0 && <span className="seller-product__count"><Check size={13} /> {t("В корзине")}: {quantity}</span>}
      </div>
      <div className="seller-product__body">
        <div className="seller-product__meta">
          {shop && <Link to={sellerLink(shop.id)} className="seller-product__shop"><Store size={13} aria-hidden="true" />{t(shop.name)}</Link>}
          {product.category && <span className="seller-product__category">{t(product.category)}</span>}
        </div>
        <h2 className="seller-product__title"><Link to={productLink(product.id)}>{name}</Link></h2>
        <div className="seller-product__bottom">
          <strong className="seller-product__price">{formatPrice(product.price)}</strong>
          <button type="button" className="seller-product__add" onClick={() => onAdd?.(product)} disabled={!onAdd} aria-label={`${t("Добавить в корзину")}: ${name}`}><Plus size={19} strokeWidth={2.3} aria-hidden="true" /></button>
        </div>
      </div>
    </article>
  );
}

export function ShopCard({ shop }) {
  const shopProducts = products.filter((p) => p.shopId === shop.id);
  const review = Array.isArray(shop.reviews) ? shop.reviews[0] : null;
  return (
    <article className="seller-shop">
      <Link to={sellerLink(shop.id)} className="seller-shop__top">
        <ShopLogo shop={shop} />
        <div className="seller-shop__identity"><h2>{t(shop.name)}</h2><ShopRating shop={shop} /></div>
        <span className="seller-shop__arrow"><ArrowUpRight size={19} aria-hidden="true" /></span>
      </Link>
      {shop.description && <p className="seller-shop__description">{t(shop.description)}</p>}
      <div className="seller-shop__preview-heading"><span>{t("Витрина")}</span><span>{shopProducts.length} {t("товаров")}</span></div>
      <div className="seller-shop__previews">
        {shopProducts.slice(0, 3).map((p) => <Link key={p.id} to={productLink(p.id)} className="seller-shop__preview" aria-label={t(p.name)}><ProductImage product={p} /><strong>{formatPrice(p.price)}</strong></Link>)}
        {shopProducts.length === 0 && <span className="seller-shop__no-products">{t("Товары скоро появятся")}</span>}
      </div>
      {review?.text && <blockquote className="seller-shop__review"><p>“{t(review.text)}”</p><footer>{t(review.author || "Покупатель")} · {t("пример отзыва")}</footer></blockquote>}
      <Link to={sellerLink(shop.id)} className="seller-shop__open">{t("Открыть профиль")}<ArrowUpRight size={17} aria-hidden="true" /></Link>
    </article>
  );
}

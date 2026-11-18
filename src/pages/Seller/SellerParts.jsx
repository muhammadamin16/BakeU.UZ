import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, ImageOff, Plus, Star, Store } from "lucide-react";
import { translateText } from "../../i18n/index.js";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import { products as catalogProducts, getShop } from "../../store/sellerData";
import { formatPrice, shopUrl } from "./format";
import "./SellerParts.css";

const t = (value) => translateText(String(value ?? ""));
const productLink = (id) => `/product/${encodeURIComponent(String(id))}`;
const sellerLink = (id) => `/seller${shopUrl(id)}`;

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  return product.image && !failed
    ? <img src={product.image} alt={t(product.name)} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <span className="sp-image-fallback" role="img" aria-label={t("Нет фото")}><ImageOff size={24} /></span>;
}

export function ShopLogo({ shop }) {
  const [failed, setFailed] = useState(false);
  const initials = shop?.initials || String(shop?.name || "B").slice(0, 2).toUpperCase();
  return <span className="seller-shop__logo" style={{ "--shop-color": shop?.color || "#dca978" }} aria-hidden="true">{shop?.logo && !failed ? <img src={shop.logo} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials}</span>;
}

export function ShopRating({ shop }) {
  const rating = Number(shop?.rating);
  return <div className="seller-shop__rating">{Number.isFinite(rating) && rating > 0 ? <><Star size={13} fill="currentColor" /><strong>{rating.toFixed(1)}</strong></> : <span>{t("Новый магазин")}</span>}{Number(shop?.reviewsCount) > 0 && <span className="seller-shop__rating-count">({shop.reviewsCount})</span>}</div>;
}

export function ProductCard({ product, quantity = 0, onAdd }) {
  const shop = getShop(product.shopId);
  return <article className="seller-product">
    <div className="seller-product__image">
      <Link to={productLink(product.id)} className="seller-product__image-link" aria-label={t(product.name)}><ProductImage product={product} /></Link>
      <div className="seller-product__favorite"><FavoriteButton product={product} /></div>
      {quantity > 0 && <span className="seller-product__count"><Check size={12} />{quantity}</span>}
    </div>
    <div className="seller-product__body">
      {shop && <Link to={sellerLink(shop.id)} className="seller-product__shop"><Store size={12} />{t(shop.name)}</Link>}
      <h2 className="seller-product__title"><Link to={productLink(product.id)}>{t(product.name)}</Link></h2>
      <div className="seller-product__bottom"><strong className="seller-product__price">{formatPrice(product.price)}</strong><button type="button" className="seller-product__add" onClick={() => onAdd?.(product)} disabled={!onAdd} aria-label={`${t("Добавить в корзину")}: ${t(product.name)}`}><Plus size={19} /></button></div>
    </div>
  </article>;
}

export function ShopCard({ shop, products = catalogProducts }) {
  const shopProducts = products.filter((product) => String(product.shopId) === String(shop.id));
  const featured = shopProducts.slice(0, 3);
  const main = featured[0];

  return (
    <article className="seller-shop seller-shop--editorial">
      <div className="seller-shop__cover">
        {main ? (
          <Link className="seller-shop__cover-link" to={sellerLink(shop.id)} aria-label={t(shop.name)}>
            <ProductImage product={main} />
          </Link>
        ) : (
          <Link className="seller-shop__cover-link" to={sellerLink(shop.id)} aria-label={t(shop.name)}>
            <span className="seller-shop__cover-empty"><Store size={32} /></span>
          </Link>
        )}
        <span className="seller-shop__cover-count">{shopProducts.length} {t("товаров")}</span>
      </div>

      <div className="seller-shop__content">
        <Link className="seller-shop__top" to={sellerLink(shop.id)}>
          <ShopLogo shop={shop} />
          <div className="seller-shop__identity">
            <h2>{t(shop.name)}</h2>
            <ShopRating shop={shop} />
          </div>
          <span className="seller-shop__arrow"><ArrowUpRight size={17} /></span>
        </Link>

        <div className="seller-shop__previews" aria-label={t("Товары магазина")}>
          {featured.length ? featured.map((product) => (
            <Link
              to={productLink(product.id)}
              key={product.id}
              className="seller-shop__preview"
              title={t(product.name)}
              aria-label={t(product.name)}
            >
              <ProductImage product={product} />
            </Link>
          )) : <span className="seller-shop__no-products">{t("Скоро появятся товары")}</span>}
        </div>

        <Link className="seller-shop__open" to={sellerLink(shop.id)}>
          {t("Открыть магазин")}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}

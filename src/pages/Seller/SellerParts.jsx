import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Star, Store } from "lucide-react";
import { translateText } from "../../i18n/index.js";
import CatalogProductCard, { ProductImage } from "../../components/ProductCard/ProductCard";
import { products as catalogProducts } from "../../store/sellerData";
import { shopUrl } from "./format";
import "./SellerParts.css";

const t = (value) => translateText(String(value ?? ""));
const productLink = (id) => `/product/${encodeURIComponent(String(id))}`;
const sellerLink = (shop) => shop.server ? `/shop/${encodeURIComponent(shop.id)}` : `/seller${shopUrl(shop.id)}`;

export function ShopLogo({ shop }) {
  const [failed, setFailed] = useState(false);
  const initials = shop?.initials || String(shop?.name || "B").slice(0, 2).toUpperCase();
  return <span className="seller-shop__logo" style={{ "--shop-color": shop?.color || "#dca978" }} aria-hidden="true">{shop?.logo && !failed ? <img src={shop.logo} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials}</span>;
}

export function ShopRating({ shop }) {
  const rating = Number(shop?.rating);
  return <div className="seller-shop__rating">{Number.isFinite(rating) && rating > 0 ? <><Star size={13} fill="currentColor" /><strong>{rating.toFixed(1)}</strong></> : <span>{t("Новый магазин")}</span>}{Number(shop?.reviewsCount) > 0 && <span className="seller-shop__rating-count">({shop.reviewsCount})</span>}</div>;
}

export function ProductCard({ product, quantity, onAdd, shop }) {
  return (
    <CatalogProductCard
      product={product}
      quantity={quantity}
      onAdd={onAdd}
      sellerName={shop?.name}
      sellerUrl={shop ? sellerLink(shop) : undefined}
    />
  );
}

export function ShopCard({ shop, products = catalogProducts }) {
  const shopProducts = products.filter((product) => String(product.shopId) === String(shop.id));
  const featured = shopProducts.slice(0, 3);
  const main = featured[0];

  return (
    <article className="catalog-card seller-shop">
      <div className="catalog-card__media seller-shop__cover">
        {main ? (
          <Link className="seller-shop__cover-link" to={sellerLink(shop)} aria-label={t(shop.name)}>
            <ProductImage product={main} />
          </Link>
        ) : (
          <Link className="seller-shop__cover-link" to={sellerLink(shop)} aria-label={t(shop.name)}>
            <span className="seller-shop__cover-empty"><Store size={32} /></span>
          </Link>
        )}
        <span className="seller-shop__cover-count">{shopProducts.length} {t("товаров")}</span>
      </div>

      <div className="catalog-card__body">
        <Link className="seller-shop__top" to={sellerLink(shop)}>
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

        <Link className="seller-shop__open" to={sellerLink(shop)}>
          {t("Открыть магазин")}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}

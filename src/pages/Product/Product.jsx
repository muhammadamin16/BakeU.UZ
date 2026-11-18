import { translateText } from "../../i18n/index.js";
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  MessageCircle,
  Check,
  MapPin,
  Clock,
  Star,
  Store,
} from "lucide-react";
import { useCatalog } from "../../store/sellerData";
import { useShopStore } from "../../store/shopStore";
import { useCartStore } from "../../store/cartStore";
import { useWorkspace, followShop } from "../../store/workspaceStore";
import { accountId } from "../../store/localAccount";
import FavoriteButton from "../../components/FavoriteButton/FavoriteButton";
import ProductImage from "../../components/ProductImage/ProductImage";
import {
  detailsFor,
  cartSelection,
  categoryFields,
  fieldLabels,
} from "./productDetails";
import "./Product.css";
const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " сум";
export default function Product() {
  const { id } = useParams();
  return <ProductView key={id} id={id} />;
}
function ProductView({ id }) {
  const { products, shops } = useCatalog();
  const local = useShopStore((s) => s.products[id]);
  const raw = local || products.find((p) => p.id === id);
  const cart = useCartStore();
  const follows = useWorkspace((s) => s.follows);
  const reviews = useWorkspace((s) => s.reviews).filter(
    (r) => r.productId === id,
  );
  const navigate = useNavigate();
  const [variantId, setVariantId] = useState(""),
    [photo, setPhoto] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  let account;
  try {
    account = JSON.parse(
      sessionStorage.getItem("bakeu-demo-profile") || "null",
    );
  } catch {
    /* A missing browser profile means guest access. */
  }
  if (!raw)
    return (
      <section className="pd-page pd-empty">
        <h1>{translateText("Товар не найден")}</h1>
        <p>{translateText("Возможно, продавец удалил его.")}</p>
        <Link to="/seller?tab=products">
          {translateText("Вернуться к товарам")}
        </Link>
      </section>
    );
  const p = detailsFor(raw),
    shop = shops.find((s) => s.id === p.shopId);
  const variant = p.variants.find((v) => v.id === variantId) || p.variants[0];
  const selection = cartSelection(p, variant),
    qty = cart.items[selection.id] || 0;
  const photos = [...new Set([p.image, ...(p.images || [])].filter(Boolean))];
  const following =
    account &&
    follows.some(
      (f) => f.buyerId === accountId(account) && f.shopId === p.shopId,
    );
  const specs = { ...p, ...variant };
  const related = products
    .filter(
      (x) =>
        x.id !== id && (x.shopId === p.shopId || x.category === p.category),
    )
    .slice(0, 3);
  function follow() {
    if (!account) {
      setNotice("Войдите в аккаунт, чтобы подписаться на магазин.");
      return;
    }
    try {
      followShop(account, p.shopId);
      setNotice(
        following ? "Вы отписались от магазина." : "Вы подписались на магазин.",
      );
    } catch {
      setNotice("Не удалось сохранить подписку.");
    }
  }
  function add() {
    try {
      cart.add(selection);
      setNotice("Добавлено в корзину");
    } catch {
      setNotice("Не удалось сохранить корзину.");
    }
  }
  return (
    <div className="pd-page">
      <nav className="pd-crumb" aria-label={translateText("Навигация")}>
        <Link to="/seller?tab=products">
          <ArrowLeft size={16} />
          {translateText(" Все товары")}
        </Link>
        <span>/</span>
        <span>{translateText(p.category)}</span>
      </nav>
      <div className="pd-top">
        <section
          className="pd-gallery"
          aria-label={translateText("Фотографии товара")}
        >
          <div className="pd-main-photo">
            <ProductImage src={photos[photo]} name={p.name} />
            <FavoriteButton product={p} />
          </div>
          {photos.length > 1 && (
            <div className="pd-thumbs">
              {photos.map((src, i) => (
                <button
                  type="button"
                  key={src}
                  aria-label={translateText("Фото " + (i + 1))}
                  aria-pressed={i === photo}
                  onClick={() => setPhoto(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
          <p className="pd-caption">
            {translateText(
              "Детали заказа и оформление можно обсудить с продавцом.",
            )}
          </p>
        </section>
        <section className="pd-panel pd-buy">
          <span className="pd-kicker">
            {translateText(p.category)} ·{" "}
            {translateText(
              p.available === false ? "Нет в наличии" : "Доступен к заказу",
            )}
          </span>
          <h1>{translateText(p.name)}</h1>
          {shop && (
            <Link
              className="pd-shop-link"
              to={"/seller?shop=" + encodeURIComponent(shop.id)}
            >
              <Store size={17} />
              {translateText(shop.name)}
              <span>{translateText("Открыть магазин →")}</span>
            </Link>
          )}
          <p className="pd-description">
            {translateText(
              p.description ||
                "Подробности о составе и приготовлении уточняйте у продавца.",
            )}
          </p>
          {p.variants.length > 0 && (
            <fieldset className="pd-options">
              <legend>{translateText("Выберите вариант")}</legend>
              {p.variants.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  aria-pressed={variant?.id === v.id}
                  onClick={() => setVariantId(v.id)}
                >
                  {translateText(v.label)}
                  <small>{translateText(money(v.price))}</small>
                </button>
              ))}
            </fieldset>
          )}
          <dl className="pd-specs">
            {categoryFields(p.category)
              .filter((k) => specs[k])
              .map((k) => (
                <div key={k}>
                  <dt>{translateText(fieldLabels[k])}</dt>
                  <dd>{translateText(specs[k])}</dd>
                </div>
              ))}
          </dl>
          <div className="pd-price">
            <strong>{translateText(money(selection.price))}</strong>
            <span>
              {translateText("за ")}
              {translateText(variant?.label || p.unit || "1 шт.")}
            </span>
          </div>
          <div className="pd-purchase">
            {qty > 0 ? (
              <>
                <div className="pd-counter">
                  <button
                    aria-label={translateText("Уменьшить количество")}
                    onClick={() => cart.decrease(selection.id)}
                  >
                    <Minus size={18} />
                  </button>
                  <output aria-live="polite">{translateText(qty)}</output>
                  <button
                    aria-label={translateText("Увеличить количество")}
                    disabled={p.available === false}
                    onClick={add}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <Link className="pd-button primary" to="/cart">
                  <ShoppingBag size={18} />
                  {translateText(" В корзине ·")}{" "}
                  {translateText(money(qty * selection.price))}
                </Link>
                <button
                  className="pd-delete"
                  aria-label={translateText(
                    "Убрать выбранный вариант из корзины",
                  )}
                  onClick={() => cart.remove(selection.id)}
                >
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <button
                disabled={p.available === false}
                className="pd-button primary"
                onClick={add}
              >
                <ShoppingBag size={19} />
                {translateText(
                  p.available === false
                    ? "Нет в наличии"
                    : "Добавить в корзину",
                )}
              </button>
            )}
          </div>
          {shop && (
            <button
              className="pd-button"
              onClick={() =>
                navigate("/messages?seller=" + encodeURIComponent(shop.id))
              }
            >
              <MessageCircle size={18} />
              {translateText(" Написать продавцу")}
            </button>
          )}
          <p className="pd-notice" role="status">
            {translateText(notice)}
            {notice.startsWith("Войдите") && (
              <>
                {" "}
                <Link to="/login">{translateText("Войти →")}</Link>
              </>
            )}
          </p>
          <div className="pd-delivery">
            <Clock size={18} />
            <span>
              {translateText(
                p.leadTime || "Срок приготовления уточняйте у продавца",
              )}
            </span>
          </div>
        </section>
      </div>
      <div className="pd-lower">
        <div>
          <section className="pd-panel">
            <h2>{translateText("О продукте")}</h2>
            <div className="pd-info-grid">
              {[
                ["Состав", p.ingredients],
                ["Аллергены", p.allergens],
                ["Хранение и срок годности", p.storage],
                ["Доставка и самовывоз", p.delivery],
              ].map(([label, value]) => (
                <div key={label}>
                  <h3>{translateText(label)}</h3>
                  <p>{translateText(value || "Уточните у продавца")}</p>
                </div>
              ))}
            </div>
            {p.demoDetails && (
              <small className="pd-caption">
                {translateText(
                  "Характеристики демонстрационного товара приведены для примера.",
                )}
              </small>
            )}
          </section>
          <section className="pd-panel">
            <h2>
              {translateText("Отзывы о товаре")}{" "}
              <span className="pd-muted">· {reviews.length}</span>
            </h2>
            {reviews.length ? (
              reviews.map((r) => (
                <article className="pd-review" key={r.id}>
                  <strong>
                    {translateText(r.author || r.buyerName || "Покупатель")}
                  </strong>
                  <span>
                    <Star size={15} />
                    {translateText(r.rating)} / 5
                  </span>
                  <p>{r.text}</p>
                </article>
              ))
            ) : (
              <p className="pd-muted">
                {translateText("Пока нет отзывов об этом товаре.")}
              </p>
            )}
          </section>
        </div>
        {shop && (
          <aside className="pd-panel pd-seller">
            <img
              className="pd-banner"
              src={shop.banner || "/images/banners/shop-cover.webp"}
              alt={translateText("Обложка " + shop.name)}
            />
            <div className="pd-seller-title">
              <span className="pd-logo">
                {shop.logo ? (
                  <ProductImage src={shop.logo} name={shop.name} />
                ) : (
                  shop.initials
                )}
              </span>
              <div>
                <h2>{translateText(shop.name)}</h2>
                <small>{translateText("Магазин на BakeU")}</small>
              </div>
            </div>
            <p>{translateText(shop.about || shop.description)}</p>
            <p className="pd-delivery">
              <MapPin size={17} />
              {translateText(shop.address || "Адрес уточняется")}
            </p>
            <Link
              className="pd-button"
              to={"/seller?shop=" + encodeURIComponent(shop.id)}
            >
              {translateText("Посмотреть магазин →")}
            </Link>
            <button
              className={"pd-button " + (following ? "" : "primary")}
              aria-pressed={!!following}
              onClick={follow}
            >
              {following ? <Check size={18} /> : <Plus size={18} />}{" "}
              {translateText(
                following ? "Вы подписаны · Отписаться" : "Подписаться",
              )}
            </button>
          </aside>
        )}
      </div>
      {related.length > 0 && (
        <section className="pd-related">
          <h2>{translateText("Ещё вкусное рядом")}</h2>
          <div>
            {related.map((x) => (
              <Link
                className="pd-panel"
                key={x.id}
                to={"/product/" + encodeURIComponent(x.id)}
              >
                <ProductImage src={x.image} name={x.name} />
                <h3>{translateText(x.name)}</h3>
                <strong>{translateText(money(x.price))}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

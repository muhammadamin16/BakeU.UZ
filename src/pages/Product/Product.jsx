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
import { useCatalog } from "../Seller/sellerData";
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
  } catch {}
  if (!raw)
    return (
      <section className="pd-page pd-empty">
        <h1>Товар не найден</h1>
        <p>Возможно, продавец удалил его.</p>
        <Link to="/seller?tab=products">Вернуться к товарам</Link>
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
      <nav className="pd-crumb" aria-label="Навигация">
        <Link to="/seller?tab=products">
          <ArrowLeft size={16} /> Все товары
        </Link>
        <span>/</span>
        <span>{p.category}</span>
      </nav>
      <div className="pd-top">
        <section className="pd-gallery" aria-label="Фотографии товара">
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
                  aria-label={"Фото " + (i + 1)}
                  aria-pressed={i === photo}
                  onClick={() => setPhoto(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
          <p className="pd-caption">
            Детали заказа и оформление можно обсудить с продавцом.
          </p>
        </section>
        <section className="pd-panel pd-buy">
          <span className="pd-kicker">
            {p.category} ·{" "}
            {p.available === false ? "Нет в наличии" : "Доступен к заказу"}
          </span>
          <h1>{p.name}</h1>
          {shop && (
            <Link
              className="pd-shop-link"
              to={"/seller?shop=" + encodeURIComponent(shop.id)}
            >
              <Store size={17} />
              {shop.name}
              <span>Открыть магазин →</span>
            </Link>
          )}
          <p className="pd-description">
            {p.description ||
              "Подробности о составе и приготовлении уточняйте у продавца."}
          </p>
          {p.variants.length > 0 && (
            <fieldset className="pd-options">
              <legend>Выберите вариант</legend>
              {p.variants.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  aria-pressed={variant?.id === v.id}
                  onClick={() => setVariantId(v.id)}
                >
                  {v.label}
                  <small>{money(v.price)}</small>
                </button>
              ))}
            </fieldset>
          )}
          <dl className="pd-specs">
            {categoryFields(p.category)
              .filter((k) => specs[k])
              .map((k) => (
                <div key={k}>
                  <dt>{fieldLabels[k]}</dt>
                  <dd>{specs[k]}</dd>
                </div>
              ))}
          </dl>
          <div className="pd-price">
            <strong>{money(selection.price)}</strong>
            <span>за {variant?.label || p.unit || "1 шт."}</span>
          </div>
          <div className="pd-purchase">
            {qty > 0 ? (
              <>
                <div className="pd-counter">
                  <button
                    aria-label="Уменьшить количество"
                    onClick={() => cart.decrease(selection.id)}
                  >
                    <Minus size={18} />
                  </button>
                  <output aria-live="polite">{qty}</output>
                  <button
                    aria-label="Увеличить количество"
                    disabled={p.available === false}
                    onClick={add}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <Link className="pd-button primary" to="/cart">
                  <ShoppingBag size={18} /> В корзине ·{" "}
                  {money(qty * selection.price)}
                </Link>
                <button
                  className="pd-delete"
                  aria-label="Убрать выбранный вариант из корзины"
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
                {p.available === false ? "Нет в наличии" : "Добавить в корзину"}
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
              <MessageCircle size={18} /> Написать продавцу
            </button>
          )}
          <p className="pd-notice" role="status">
            {notice}
            {notice.startsWith("Войдите") && (
              <>
                {" "}
                <Link to="/login">Войти →</Link>
              </>
            )}
          </p>
          <div className="pd-delivery">
            <Clock size={18} />
            <span>
              {p.leadTime || "Срок приготовления уточняйте у продавца"}
            </span>
          </div>
        </section>
      </div>
      <div className="pd-lower">
        <div>
          <section className="pd-panel">
            <h2>О продукте</h2>
            <div className="pd-info-grid">
              {[
                ["Состав", p.ingredients],
                ["Аллергены", p.allergens],
                ["Хранение и срок годности", p.storage],
                ["Доставка и самовывоз", p.delivery],
              ].map(([label, value]) => (
                <div key={label}>
                  <h3>{label}</h3>
                  <p>{value || "Уточните у продавца"}</p>
                </div>
              ))}
            </div>
            {p.demoDetails && (
              <small className="pd-caption">
                Характеристики демонстрационного товара приведены для примера.
              </small>
            )}
          </section>
          <section className="pd-panel">
            <h2>
              Отзывы о товаре{" "}
              <span className="pd-muted">· {reviews.length}</span>
            </h2>
            {reviews.length ? (
              reviews.map((r) => (
                <article className="pd-review" key={r.id}>
                  <strong>{r.author || r.buyerName || "Покупатель"}</strong>
                  <span>
                    <Star size={15} />
                    {r.rating} / 5
                  </span>
                  <p>{r.text}</p>
                </article>
              ))
            ) : (
              <p className="pd-muted">Пока нет отзывов об этом товаре.</p>
            )}
          </section>
        </div>
        {shop && (
          <aside className="pd-panel pd-seller">
            <img
              className="pd-banner"
              src={shop.banner || "/images/banners/shop-cover.png"}
              alt={"Обложка " + shop.name}
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
                <h2>{shop.name}</h2>
                <small>Магазин на BakeU</small>
              </div>
            </div>
            <p>{shop.about || shop.description}</p>
            <p className="pd-delivery">
              <MapPin size={17} />
              {shop.address || "Адрес уточняется"}
            </p>
            <Link
              className="pd-button"
              to={"/seller?shop=" + encodeURIComponent(shop.id)}
            >
              Посмотреть магазин →
            </Link>
            <button
              className={"pd-button " + (following ? "" : "primary")}
              aria-pressed={!!following}
              onClick={follow}
            >
              {following ? <Check size={18} /> : <Plus size={18} />}{" "}
              {following ? "Вы подписаны · Отписаться" : "Подписаться"}
            </button>
          </aside>
        )}
      </div>
      {related.length > 0 && (
        <section className="pd-related">
          <h2>Ещё вкусное рядом</h2>
          <div>
            {related.map((x) => (
              <Link
                className="pd-panel"
                key={x.id}
                to={"/product/" + encodeURIComponent(x.id)}
              >
                <ProductImage src={x.image} name={x.name} />
                <h3>{x.name}</h3>
                <strong>{money(x.price)}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { accountAPI, apiBaseURL, phoneAccountsEnabled, productImageURL } from "../api/account.js";
import { useCartStore } from "../store/cartStore.js";
import { createServerCart, lineKey } from "./serverCart.js";
import { translateText as t } from "../i18n/index.js";
import FavoriteButton from "../components/FavoriteButton/FavoriteButton.jsx";
import PhotoCarousel from "../components/PhotoCarousel/PhotoCarousel.jsx";
import "./orders.css";

export default function ProductPage() {
  const { id } = useParams();
  return <CatalogProduct key={id} id={id} />;
}

function CatalogProduct({ id }) {
  const [product, setProduct] = useState(null);
  const [notice, setNotice] = useState("");
  const [variantId, setVariantId] = useState("");
  const [busy, setBusy] = useState(false);
  const add = useCartStore((state) => state.add);
  useEffect(() => {
    const controller = new AbortController();
    if (!apiBaseURL) {
      return () => controller.abort();
    }
    fetch(`${apiBaseURL}/products/${encodeURIComponent(id)}`, {
      signal: controller.signal, credentials: "omit", redirect: "error",
    }).then(async (response) => {
      if (!response.ok) throw Error("Товар недоступен.");
      setProduct(await response.json());
    }).catch((error) => {
      if (!controller.signal.aborted) setNotice(error.message);
    });
    return () => controller.abort();
  }, [id]);

  async function save() {
    setBusy(true);
    setNotice("");
    try {
      let buyer;
      try {
        buyer = await accountAPI.request("/me");
      } catch (error) {
        if (error.status !== 401) throw error;
        add({
          id: lineKey(product.id, variantId), productId: product.id, variantId,
          name: product.title, variantLabel: selected?.name || "",
          price: selected?.price ?? product.price, image,
        });
        setNotice("Товар сохранён в гостевой корзине.");
        return;
      }
      if (buyer.uid === product.sellerId) {
        setNotice("Нельзя заказать собственный товар.");
        return;
      }
      const request = async (path, options) => {
        const account = await accountAPI.request("/me");
        if (account.uid !== buyer.uid) throw Error("Аккаунт изменился. Повторите действие.");
        return accountAPI.requestWithOptions(path, { ...options, headers: { ...options?.headers, "X-BakeU-Account": buyer.uid } });
      };
      const cart = createServerCart(request);
      const snapshot = await cart.load();
      const existing = snapshot.items.find((line) => line.productId === product.id && line.variantId === variantId);
      await cart.save({ productId: product.id, variantId, qty: (existing?.qty || 0) + 1 }, snapshot.revision);
      setNotice("Товар сохранён в корзине аккаунта.");
    } catch (error) {
      setNotice(error.status === 409 ? "Корзина изменилась. Повторите добавление." : error.message);
    } finally {
      setBusy(false);
    }
  }

  const selected = product?.variants?.find((variant) => variant.id === variantId);
  const photos = (product?.imageURLs || []).map(productImageURL).filter(Boolean);
  const [image] = photos;
  return (
    <section className="tg-orders-panel">
      <Link to="/seller">Каталог</Link>{" · "}<Link to="/cart">Корзина</Link>
      {(!apiBaseURL || notice) && <p role="status">{t(notice || "Подключение к каталогу не настроено.")}</p>}
      {!product && apiBaseURL && !notice && <p role="status">Загрузка товара…</p>}
      {product && <>
        <h1>{product.title}</h1>
        <FavoriteButton product={{ ...product, name: product.title }} />
        {image && <PhotoCarousel
          product={{ image, images: photos }}
          thumbnails
          renderImage={(src) => <img src={src} alt={product.title} />}
        />}
        <p>{product.category}</p>
        <p>{product.description || t("Не указано")}</p>
        <dl>
          {[
            ["Единица измерения", product.unit],
            ["Вес", product.weight],
            ["Порции", product.portions],
            ["Состав", product.ingredients],
            ["Аллергены", product.allergens],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{t(label)}</dt>
              <dd>{value ?? t("Не указано")}</dd>
            </div>
          ))}
        </dl>
        <p>{Number(selected?.price ?? product.price).toLocaleString("ru-RU")} UZS</p>
        {product.variants?.some((variant) => variant.id) && (
          <label>Вариант <select disabled={busy} value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            <option value="">Базовый</option>
            {product.variants.filter((variant) => variant.id).map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
          </select></label>
        )}
        <button type="button" disabled={busy || !product.available} onClick={save}>Добавить в корзину</button>
        {!product.available && <p>Товар недоступен.</p>}
        {phoneAccountsEnabled && <ServerReviews id={id} />}
      </>}
    </section>
  );
}

function ServerReviews({ id }) {
  const path = `/products/${encodeURIComponent(id)}/reviews`;
  const [items, setItems] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiBaseURL + path, { signal: controller.signal, credentials: "omit" }).then(response => {
      if (!response.ok) throw new Error("Отзывы недоступны.");
      return response.json();
    }).then(reviews => {
      if (!controller.signal.aborted && Array.isArray(reviews)) setItems(reviews);
    }).catch(error => { if (!controller.signal.aborted) setNotice(error.message); });
    return () => controller.abort();
  }, [path, revision]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await accountAPI.request(path, "POST", { rating, comment });
      setComment("");
      setRevision(value => value + 1);
    } catch (error) { setNotice(error.status === 403 ? "Отзыв доступен после завершённой покупки." : error.message); }
    finally { setBusy(false); }
  }
  return <section>
    <h2>{t("Отзывы")}</h2>
    {items.map(review => <article key={review.id}><strong>{review.authorName} · {review.rating}/5</strong><p>{review.comment}</p></article>)}
    {notice && <p role="status">{t(notice)}</p>}
    <form onSubmit={submit}>
      <label>{t("Оценка")} <select value={rating} onChange={event => setRating(Number(event.target.value))}>
        {[5, 4, 3, 2, 1].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>{t("Отзыв")} <textarea maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} /></label>
      <button disabled={busy}>{t("Отправить отзыв")}</button>
    </form>
  </section>;
}

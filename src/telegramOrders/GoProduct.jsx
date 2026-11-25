import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { goAccount, goAPIBase, goLocalAccountsEnabled, productImageURL } from "../api/goAccount.js";
import { useCartStore } from "../store/cartStore.js";
import { createServerCart, lineKey } from "./serverCart.js";
import { translateText as t } from "../i18n/index.js";
import FavoriteButton from "../components/FavoriteButton/FavoriteButton.jsx";
import "./orders.css";

export default function GoProduct() {
  const { id } = useParams();
  return <CatalogProduct key={id} id={id} />;
}

function CatalogProduct({ id }) {
  const [product, setProduct] = useState(null);
  const [notice, setNotice] = useState("");
  const [sellerBlocked, setSellerBlocked] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [busy, setBusy] = useState(false);
  const add = useCartStore((state) => state.add);
  useEffect(() => {
    const controller = new AbortController();
    if (!goAPIBase) {
      return () => controller.abort();
    }
    fetch(`${goAPIBase}/products/${encodeURIComponent(id)}`, {
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
        buyer = await goAccount.request("/me");
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
      if (buyer.role === "seller") {
        setSellerBlocked(true);
        setNotice("Вы вошли как продавец. Для оформления заказа войдите в аккаунт покупателя.");
        return;
      }
      const request = async (path, options) => {
        const account = await goAccount.request("/me");
        if (account.uid !== buyer.uid) throw Error("Аккаунт изменился. Повторите действие.");
        return goAccount.requestWithOptions(path, { ...options, headers: { ...options?.headers, "X-BakeU-Account": buyer.uid } });
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
  const image = productImageURL(product?.imageURLs?.[0]);
  return (
    <section className="tg-orders-panel">
      <Link to="/seller">Каталог</Link>{" · "}<Link to="/cart">Корзина</Link>
      {(!goAPIBase || notice) && <p role="status">{t(notice || "Подключение к каталогу не настроено.")}</p>}
      {sellerBlocked && <Link className="bw-btn primary" to={goLocalAccountsEnabled
        ? `/account/orders?auth=buyer&product=${encodeURIComponent(id)}` : "/login"}>{t("Стать покупателем")}</Link>}
      {!product && goAPIBase && !notice && <p role="status">Загрузка товара…</p>}
      {product && <>
        <h1>{product.title}</h1>
        <FavoriteButton product={{ ...product, name: product.title }} />
        {image && <img src={image} width="160" alt={product.title} />}
        <p>{product.category}</p>
        <p>{product.description}</p>
        <p>{Number(selected?.price ?? product.price).toLocaleString("ru-RU")} UZS</p>
        {product.variants?.some((variant) => variant.id) && (
          <label>Вариант <select disabled={busy} value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            <option value="">Базовый</option>
            {product.variants.filter((variant) => variant.id).map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
          </select></label>
        )}
        <button type="button" disabled={busy || !product.available} onClick={save}>Добавить в корзину</button>
        {!product.available && <p>Товар недоступен.</p>}
      </>}
    </section>
  );
}

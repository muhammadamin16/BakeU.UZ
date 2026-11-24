import { useEffect, useState } from "react";
import { goAccount as api, productImageURL } from "../../../api/goAccount.js";
import { translateText } from "../../../i18n/index.js";
import { maxProductPrice, productPayload, validateProductImage } from "../../../api/productPayload.js";

const emptyProduct = { title: "", description: "", category: "", price: "", available: true, variants: [] };

export default function ServerProducts({ sellerId, accountApi = api }) {
  const api = accountApi;
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(emptyProduct);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    let active = true;
    api.request(`/products?seller=${encodeURIComponent(sellerId)}`)
      .then((items) => { if (active) setProducts(items); })
      .catch((error) => { if (active) setNotice(error.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [sellerId, api]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const payload = productPayload(draft);
      const item = await api.request(draft.id ? `/products/${encodeURIComponent(draft.id)}` : "/products",
        draft.id ? "PUT" : "POST", payload);
      setProducts((current) => [...current.filter(({ id }) => id !== item.id), item]);
      setDraft(item);
      setNotice("Товар сохранён.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice("");
    try {
      validateProductImage(file);
      const body = new FormData();
      body.append("image", file);
      const result = await api.request(`/products/${encodeURIComponent(draft.id)}/image`, "POST", body);
      setDraft((current) => ({ ...current, imageURLs: result.imageURLs }));
      setProducts((current) => current.map((product) => product.id === draft.id
        ? { ...product, imageURLs: result.imageURLs } : product));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting || busy) return;
    const id = deleting.id;
    setBusy(true);
    setNotice("");
    try {
      await api.request(`/products/${encodeURIComponent(id)}`, "DELETE");
      setProducts((current) => current.filter((product) => product.id !== id));
      setDraft((current) => current.id === id ? emptyProduct : current);
      setDeleting(null);
      setNotice("Товар удалён из каталога. Данные и история заказов сохранены.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function updateVariant(index, patch) {
    setDraft((current) => ({
      ...current, variants: current.variants.map((variant, i) => i === index ? { ...variant, ...patch } : variant),
    }));
  }

  return (
    <section aria-busy={busy}>
      <h3>{translateText("Товары магазина")}</h3>
      {notice && <p role="status">{translateText(notice)}</p>}
      {!busy && !products.length && !notice && <p>{translateText("В магазине пока нет товаров.")}</p>}
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            {productImageURL(product.imageURLs?.[0]) && <img src={productImageURL(product.imageURLs[0])} alt={product.title} width="64" />}
            <button className="bw-btn" type="button" disabled={busy} onClick={() => setDraft(product)}>
              {product.title}
            </button>
            <button className="bw-btn" type="button" disabled={busy} onClick={() => setDeleting(product)} aria-label={`${translateText("Удалить товар")}: ${product.title}`}>
              {translateText("Удалить товар")}
            </button>
          </li>
        ))}
      </ul>
      {deleting && <div role="group" aria-label={translateText("Удаление товара")}>
        <p>{deleting.title} · {translateText("Убрать товар из каталога? Данные и история заказов сохранятся.")}</p>
        <button className="bw-btn" type="button" disabled={busy} onClick={remove}>{translateText("Подтвердить удаление")}</button>
        <button className="bw-btn" type="button" disabled={busy} onClick={() => setDeleting(null)}>{translateText("Отмена")}</button>
      </div>}
      <form onSubmit={save}>
        <fieldset className="bw-fields" disabled={busy}>
          <legend>{translateText(draft.id ? "Редактировать товар" : "Добавить товар")}</legend>
          {[
            ["title", "Название", "text"], ["description", "Описание", "text"],
            ["category", "Категория", "text"], ["price", "Цена", "number"],
          ].map(([key, label, type]) => (
            <label className="bw-field" key={key}>{translateText(label)}
              <input type={type} value={draft[key] ?? ""}
                required={key === "title" || key === "price"}
                min={key === "price" ? "0.01" : undefined} step={key === "price" ? "any" : undefined}
                max={key === "price" ? maxProductPrice : undefined}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            </label>
          ))}
          <label className="bw-field">
            <input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} />
            {translateText("В наличии")}
          </label>
          {(draft.variants || []).map((variant, index) => (
            <div className="bw-fields" key={index}>
              <label className="bw-field">{translateText("Вариант")}
                <input value={variant.name} required maxLength={100} onChange={(event) => updateVariant(index, { name: event.target.value })} />
              </label>
              <label className="bw-field">{translateText("Цена")}
                <input value={variant.price} type="number" min="0.01" max={maxProductPrice} step="any" required onChange={(event) => updateVariant(index, { price: event.target.value })} />
              </label>
              <button className="bw-btn" type="button" onClick={() => setDraft({ ...draft, variants: draft.variants.filter((_, i) => i !== index) })}>{translateText("Удалить вариант")}</button>
            </div>
          ))}
          <button className="bw-btn" type="button" disabled={(draft.variants?.length || 0) >= 20}
            onClick={() => setDraft({ ...draft, variants: [...(draft.variants || []), { name: "", price: "" }] })}>
            {translateText("Добавить вариант")}
          </button>
          <button className="bw-btn primary">{translateText("Сохранить товар")}</button>
          {draft.id && <button type="button" className="bw-btn" onClick={() => setDraft(emptyProduct)}>{translateText("Отмена")}</button>}
        </fieldset>
      </form>
      {draft.id && (
        <fieldset disabled={busy}>
          <legend>{translateText("Фотографии товара")}</legend>
          {(draft.imageURLs || []).map(productImageURL).filter(Boolean).map((url) => (
            <img key={url} src={url} alt={draft.title} width="96" />
          ))}
          <label className="bw-field">{translateText("Загрузить фото")}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={upload} disabled={(draft.imageURLs?.length || 0) >= 5} />
          </label>
        </fieldset>
      )}
    </section>
  );
}

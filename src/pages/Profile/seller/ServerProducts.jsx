import { useEffect, useState } from "react";
import { accountAPI as api, productImageURL } from "../../../api/account.js";
import { PRODUCT_CATEGORIES } from "../../Product/productDetails.js";
import { translateText } from "../../../i18n/index.js";

const emptyProduct = { title: "", description: "", category: "", price: "", available: true, variants: [] };

export default function ServerProducts({ sellerId, accountApi = api }) {
  const api = accountApi;
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(emptyProduct);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    api.request("/me/products")
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
      const payload = {
        title: draft.title.trim(), description: draft.description, category: draft.category,
        price: Number(draft.price), available: draft.available,
        ...(draft.id && { revision: draft.revision }),
        ...Object.fromEntries(["unit", "weight", "portions", "ingredients", "allergens"].map(key => [key, draft[key] || ""])),
        variants: (draft.variants || []).map(({ id, name, price }) => ({ ...(id ? { id } : {}), name, price: Number(price) })),
      };
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

  async function upload(event, replacement) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setNotice("");
    try {
      const body = new FormData();
      for (const file of files) body.append("image", file);
      if (replacement) body.append("replace", replacement);
      const result = await api.request(`/products/${encodeURIComponent(draft.id)}/image`, "POST", body);
      updateSaved(result);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function updateSaved(item) {
    setDraft(item);
    setProducts((items) => items.map((product) => product.id === item.id ? item : product));
  }

  async function changePhotos(patch) {
    setBusy(true);
    setNotice("");
    try {
      const item = await api.request(`/products/${encodeURIComponent(draft.id)}`, "PUT", { ...patch, revision: draft.revision });
      updateSaved(item);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!window.confirm(translateText("Архивировать товар?"))) return;
    setBusy(true);
    try {
      await api.request(`/products/${encodeURIComponent(draft.id)}`, "DELETE");
      setProducts((items) => items.filter((item) => item.id !== draft.id));
      setDraft(emptyProduct);
      setNotice("Товар архивирован.");
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
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <button className="bw-btn" type="button" disabled={busy} onClick={() => setDraft(product)}>
              {product.title}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={save}>
        <fieldset className="bw-fields" disabled={busy}>
          <legend>{translateText(draft.id ? "Редактировать товар" : "Добавить товар")}</legend>
          {[
            ["title", "Название", "text"], ["description", "Описание", "text"],
            ["price", "Цена", "number"], ["unit", "Единица измерения", "text"],
            ["weight", "Вес", "text"], ["portions", "Порции", "text"],
            ["ingredients", "Состав", "text"], ["allergens", "Аллергены", "text"],
          ].map(([key, label, type]) => (
            <label className="bw-field" key={key}>{translateText(label)}
              <input type={type} value={draft[key] ?? ""}
                required={key === "title" || key === "price"}
                min={key === "price" ? "0.01" : undefined} step={key === "price" ? "any" : undefined}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            </label>
          ))}
          <label className="bw-field">{translateText("Категория")}
            <select required value={draft.category || ""} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
              <option value="" disabled>{translateText("Выберите категорию")}</option>
              {draft.category && !PRODUCT_CATEGORIES.includes(draft.category) && <option>{draft.category}</option>}
              {PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{translateText(category)}</option>)}
            </select>
          </label>
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
                <input value={variant.price} type="number" min="0.01" step="any" required onChange={(event) => updateVariant(index, { price: event.target.value })} />
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
          {(draft.imageURLs || []).map((url, index, urls) => (
            <div key={url}>
              <ProductPhoto api={api} product={draft} url={url} />
              {index === 0 ? <span>{translateText("Обложка")}</span> : (
                <button type="button" onClick={() => {
                  const ordered = [...urls];
                  [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
                  changePhotos({ imageURLs: ordered });
                }}>{translateText("Переместить влево")}</button>
              )}
              <button type="button" onClick={() => changePhotos({ imageURLs: urls.filter(photo => photo !== url) })}>
                {translateText("Удалить фото")}
              </button>
              <label>{translateText("Заменить фото")}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event, url)} />
              </label>
            </div>
          ))}
          <label className="bw-field">{translateText("Загрузить фото")}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple
              onChange={upload} disabled={(draft.imageURLs?.length || 0) >= 5} />
          </label>
          {draft.draft && <button type="button" disabled={(draft.imageURLs?.length || 0) < 2}
            onClick={() => changePhotos({ publish: true })}>{translateText("Опубликовать товар")}</button>}
          <button type="button" onClick={archive}>{translateText("Архивировать товар")}</button>
        </fieldset>
      )}
    </section>
  );
}

export function ProductPhoto({ api, product, url, admin = false }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(false);
  const id = product.id;
  const privatePreview = admin || product.draft;
  useEffect(() => {
    if (!privatePreview || !productImageURL(url)) return;
    const controller = new AbortController();
    let objectURL;
    api.requestWithOptions(`/${admin ? "admin" : "me"}/products/${encodeURIComponent(id)}/images/${url.split("/").at(-1)}`,
      { responseType: "blob", signal: controller.signal }).then(blob => {
      if (controller.signal.aborted) return;
      objectURL = URL.createObjectURL(blob);
      setPreview(objectURL);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [admin, api, privatePreview, id, url]);
  const src = privatePreview ? preview : productImageURL(url);
  if (error && privatePreview) return <span role="status">{translateText("Фото недоступно")}</span>;
  return src ? <img src={src} alt={product.title} width="96" /> : null;
}

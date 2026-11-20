import { useEffect, useState } from "react";
import { goAccount as api, productImageURL } from "../../../api/goAccount.js";
import { translateText } from "../../../i18n/index.js";

const emptyProduct = { title: "", description: "", category: "", price: "", available: true, variants: [] };

export default function ServerProducts({ sellerId }) {
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(emptyProduct);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    api.request(`/products?seller=${encodeURIComponent(sellerId)}`)
      .then((items) => { if (active) setProducts(items); })
      .catch((error) => { if (active) setNotice(error.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [sellerId]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const payload = {
        title: draft.title.trim(), description: draft.description, category: draft.category,
        price: Number(draft.price), available: draft.available,
        variants: (draft.variants || []).map(({ name, price }) => ({ name, price: Number(price) })),
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

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice("");
    try {
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
            ["category", "Категория", "text"], ["price", "Цена", "number"],
          ].map(([key, label, type]) => (
            <label className="bw-field" key={key}>{translateText(label)}
              <input type={type} value={draft[key] ?? ""}
                required={key === "title" || key === "price"}
                min={key === "price" ? "0.01" : undefined} step={key === "price" ? "any" : undefined}
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

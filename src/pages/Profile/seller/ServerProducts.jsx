import { useEffect, useState } from "react";
import { goAccount as api } from "../../../api/goAccount.js";
import { translateText } from "../../../i18n/index.js";

const emptyProduct = { title: "", description: "", category: "", price: "", available: true };

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
      };
      const item = await api.request(draft.id ? `/products/${encodeURIComponent(draft.id)}` : "/products",
        draft.id ? "PUT" : "POST", payload);
      setProducts((current) => [...current.filter(({ id }) => id !== item.id), item]);
      setDraft(emptyProduct);
      setNotice("Товар сохранён.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
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
          <button className="bw-btn primary">{translateText("Сохранить товар")}</button>
          {draft.id && <button type="button" className="bw-btn" onClick={() => setDraft(emptyProduct)}>{translateText("Отмена")}</button>}
        </fieldset>
      </form>
    </section>
  );
}

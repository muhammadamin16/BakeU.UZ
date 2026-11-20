import { useEffect, useState } from "react";
import { goAPIBase, productImageURL } from "../../api/goAccount.js";
import { matchesLocalizedSearch, translateText } from "../../i18n/index.js";
import { normalizeSearch } from "../../i18n/alphabet.js";

export default function ServerCatalog() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${goAPIBase}/products`, { credentials: "omit", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error(String(response.status));
        const products = await response.json();
        if (!Array.isArray(products)) throw Error("Invalid response");
        setItems(products.filter((item) => item.available));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Не удалось загрузить каталог.");
      });
    return () => controller.abort();
  }, []);

  const visible = items?.filter(({ title, category }) => matchesLocalizedSearch(normalizeSearch(query.trim()), title, category));
  return (
    <main className="seller-page product-catalog">
      <h1>{translateText("Каталог товаров")}</h1>
      <label className="bw-field">{translateText("Поиск")}
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {error && <p role="alert">{translateText(error)}</p>}
      {!items && !error && <p role="status">{translateText("Загрузка…")}</p>}
      {visible?.length === 0 && <p>{translateText("Товары не найдены.")}</p>}
      <div className="seller-products-grid">
        {visible?.map((item) => {
          const image = productImageURL(item.imageURLs?.[0]);
          return (
            <article className="bw-card" key={item.id}>
              {image && <img src={image} alt={item.title} width="160" loading="lazy" />}
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <p>{item.price.toLocaleString()} UZS</p>
              {item.variants?.length > 0 && (
                <ul>{item.variants.map(({ name, price }) => <li key={name}>{name} · {price.toLocaleString()} UZS</li>)}</ul>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}

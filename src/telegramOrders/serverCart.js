const validID = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value);

function parseCart(data) {
  if (!Array.isArray(data?.items)) throw Error("Сервер вернул неверную корзину.");
  const items = data.items.map(({ productId, variantId = "", qty }) => {
    if (!validID(productId) || (variantId && !validID(variantId)) ||
        !Number.isInteger(qty) || qty < 1 || qty > 1000) {
      throw Error("В корзине есть некорректный товар.");
    }
    return { productId, variantId, qty };
  });
  if (typeof data.revision !== "string") throw Error("Сервер не поддерживает версии корзины.");
  return { items, revision: data.revision };
}

export function createServerCart(request) {
  return {
    async load(signal) {
      return parseCart(await request("/cart", { signal }));
    },
    async save({ productId, variantId = "", qty }, revision) {
      if (!validID(productId) || (variantId && !validID(variantId)) ||
          !Number.isInteger(qty) || qty < 1 || qty > 1000) {
        throw Error("Укажите корректное количество товара.");
      }
      return parseCart(await request("/cart/items", {
        method: "POST",
        body: { productId, variantId, qty, cartRevision: revision },
      }));
    },
    async remove({ productId, variantId }, revision) {
      const params = new URLSearchParams({ variantId, cartRevision: revision });
      const path = `/cart/items/${encodeURIComponent(productId)}?${params}`;
      return parseCart(await request(path, { method: "DELETE" }));
    },
  };
}

export function lineKey(productId, variantId = "") {
  return JSON.stringify([productId, variantId]);
}

export function restoreCart(items, products) {
  const catalog = new Map(products.map((item) => [item.id, item]));
  const qty = Object.create(null);
  const skipped = [];
  for (const line of items) {
    const item = catalog.get(line.productId);
    const key = lineKey(line.productId, line.variantId);
    if (!item || (line.variantId && !item.variants?.some(({ id }) => id === line.variantId)) ||
        Object.hasOwn(qty, key)) {
      skipped.push(line);
      continue;
    }
    qty[key] = line.qty;
  }
  return { qty, skipped };
}

// Checkout clears the entire server cart. Require saved quantities and
// variants to be included before using that operation.
export function includesSavedCart(saved, selection) {
  return saved.every((line) => selection.some((item) =>
    item.productId === line.productId &&
    (item.variantId || "") === line.variantId &&
    item.qty === line.qty,
  ));
}

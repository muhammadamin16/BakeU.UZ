const validID = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value);

function parseItems(data) {
  if (!Array.isArray(data?.items)) throw Error("Сервер вернул неверную корзину.");
  return data.items.map(({ productId, variantId = "", qty }) => {
    if (!validID(productId) || (variantId && !validID(variantId)) ||
        !Number.isInteger(qty) || qty < 1 || qty > 1000) {
      throw Error("В корзине есть некорректный товар.");
    }
    return { productId, variantId, qty };
  });
}

export function createServerCart(request) {
  return {
    async load(signal) {
      return parseItems(await request("/cart", { signal }));
    },
    async save({ productId, variantId = "", qty }) {
      if (!validID(productId) || (variantId && !validID(variantId)) ||
          !Number.isInteger(qty) || qty < 1 || qty > 1000) {
        throw Error("Укажите корректное количество товара.");
      }
      return parseItems(await request("/cart/items", {
        method: "POST",
        body: { productId, variantId, qty },
      }));
    },
    async remove({ productId, variantId }) {
      const path = `/cart/items/${encodeURIComponent(productId)}?variantId=${encodeURIComponent(variantId)}`;
      return parseItems(await request(path, { method: "DELETE" }));
    },
  };
}

// The existing checkout editor selects one variant per product. Explicitly
// report any saved lines it cannot represent instead of silently dropping them.
export function restoreCart(items, products) {
  const catalog = new Map(products.map((item) => [item.id, item]));
  const qty = Object.create(null);
  const variants = Object.create(null);
  const skipped = [];
  for (const line of items) {
    const item = catalog.get(line.productId);
    if (!item || (line.variantId && !item.variants?.some(({ id }) => id === line.variantId)) ||
        Object.hasOwn(qty, line.productId)) {
      skipped.push(line);
      continue;
    }
    qty[line.productId] = line.qty;
    variants[line.productId] = line.variantId;
  }
  return { qty, variants, skipped };
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

import { lineKey } from "./serverCart.js";

// Copy only unambiguous lines. Existing server quantities win and the local
// source remains available even if a request fails or a line cannot be mapped.
export function planGuestImport(items, metadata, catalog, serverItems) {
  const byID = new Map(catalog.map((product) => [product.id, product]));
  const known = new Set(serverItems.map((line) => lineKey(line.productId, line.variantId)));
  const lines = [];
  let skipped = 0;
  for (const [id, qty] of Object.entries(items)) {
    const saved = metadata[id];
    const productId = saved?.productId || id;
    const variantId = saved?.variantId || "";
    const product = byID.get(productId);
    const key = lineKey(productId, variantId);
    if (!product?.available || (saved?.variantLabel && !variantId) ||
        (variantId && !product.variants?.some(({ id }) => id === variantId)) ||
        !Number.isSafeInteger(qty) || qty < 1 || qty > 1000 || known.has(key)) {
      skipped++;
      continue;
    }
    known.add(key);
    lines.push({ productId, variantId, qty });
  }
  return { lines, skipped };
}

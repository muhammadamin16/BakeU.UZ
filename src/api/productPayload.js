// Same finite positive price bound as Go models.ValidProductPrice. The
// cross-repository P0 contract also exercises this payload against Go/Mongo.
export const maxProductPrice = 1e12;
const validPrice = (value) => Number.isFinite(value) && value > 0 && value <= maxProductPrice;

export function productPayload(draft) {
  const title = String(draft.title || "").trim();
  const price = Number(draft.price);
  if (!title || !validPrice(price)) throw Error("Укажите название и цену больше 0, не более 1 000 000 000 000 сум.");
  const variants = (draft.variants || []).map(({ id, name, price }) => ({
    ...(id ? { id } : {}), name: String(name || "").trim(), price: Number(price),
  }));
  const names = variants.map(({ name }) => name.toLowerCase());
  if (variants.length > 20 || new Set(names).size !== variants.length || variants.some(({ name, price }) =>
    !name || [...name].length > 100 || !validPrice(price))) throw Error("Проверьте названия и цены вариантов товара.");
  return { title, description: draft.description || "", category: draft.category || "", price,
    available: draft.available === true, variants };
}

export function validateProductImage(file) {
  if (!file || file.size <= 0 || file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    throw Error("Выберите изображение JPEG, PNG, WebP или GIF до 5 МБ.");
  }
}

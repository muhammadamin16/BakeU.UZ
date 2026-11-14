export function productData(product) {
  if (!product || typeof product !== "object" || product.id == null) {
    throw new Error("Передайте весь товар: add(product), а не add(product.id)");
  }
  const price = Number(product.price);
  if (!Number.isFinite(price) || price < 0)
    throw new Error("Цена должна быть числом");
  const image = product.image || product.img || product.photo || "";
  return {
    id: String(product.id),
    name: product.name || product.title || "Товар",
    productId: String(product.productId || product.id),
    variantLabel: product.variantLabel || "",
    unit: product.unit || "шт.",
    shopId: product.shopId || product.sellerId || "",
    price,
    image: typeof image === "string" ? image : "",
  };
}

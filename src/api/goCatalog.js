// Public catalog only: never attach a Node token or a Go account session.
export async function loadGoCatalog(base, { fetchImpl = fetch, signal } = {}) {
  const timeout = AbortSignal.timeout(15000);
  async function read(path) {
    const response = await fetchImpl(base.replace(/\/$/, "") + path, {
      credentials: "omit", redirect: "error",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) throw new Error("Не удалось загрузить магазины с сервера.");
    return response.json();
  }
  async function markets() {
    const result = [], cursors = new Set();
    let next = "";
    do {
      const page = await read("/markets?limit=100&after=" + encodeURIComponent(next));
      if (!Array.isArray(page.items) || typeof page.next !== "string" || cursors.has(page.next) || result.length >= 10000) throw new Error("Сервер вернул неверный список магазинов.");
      result.push(...page.items);
      next = page.next;
      if (next) cursors.add(next);
    } while (next);
    return result;
  }
  const [shops, products] = await Promise.all([markets(), read("/products")]);
  if (!Array.isArray(products)) throw new Error("Сервер вернул неверный каталог.");
  return { markets: shops, products };
}

export function projectGoMapCatalog({ markets, products }, imageURL = () => "") {
  const sellers = markets.filter((shop) => typeof shop.id === "string" && typeof shop.sellerId === "string" && typeof shop.name === "string" &&
    typeof shop.lat === "number" && typeof shop.lng === "number" &&
    Number.isFinite(shop.lat) && Number.isFinite(shop.lng) && Math.abs(shop.lat) <= 90 && Math.abs(shop.lng) <= 180).map((shop) => ({
      id: shop.id, sellerId: shop.sellerId, name: shop.name,
      badge: [...shop.name].slice(0, 2).join(""), badgeColor: "#b77b48",
      categories: shop.description || "Домашняя выпечка", rating: 0,
      lat: shop.lat, lng: shop.lng,
      image: imageURL(shop.logoURL) || "/images/products/cake.jpg",
    }));
  const bySeller = new Map(sellers.map((shop) => [shop.sellerId, shop]));
  const mappedProducts = products.filter((product) => product.available === true && bySeller.has(product.sellerId) &&
    typeof product.id === "string" && typeof product.title === "string" && Number.isFinite(product.price) && product.price >= 0).map((product) => {
      const shop = bySeller.get(product.sellerId);
      return { id: product.id, shopId: shop.id, name: product.title, price: product.price,
        seller: shop.name, lat: shop.lat, lng: shop.lng,
        rating: Number.isFinite(product.ratingAvg) ? product.ratingAvg : 0,
        image: imageURL(product.imageURLs?.[0]) || "/images/products/cake.jpg" };
    });
  return { sellers, products: mappedProducts };
}

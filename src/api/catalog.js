// Public catalog only: never attach a Node token or a private account session.
export async function loadCatalog(base, { fetchImpl = fetch, signal } = {}) {
  const timeout = AbortSignal.timeout(15000);
  async function read(path) {
    const response = await fetchImpl(base.replace(/\/$/, "") + path, {
      credentials: "omit", redirect: "error",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) throw new Error("Не удалось загрузить магазины с сервера.");
    return response.json();
  }
  async function pages(path, acceptLegacyArray = false) {
    const result = [], cursors = new Set();
    let next = "";
    do {
      const page = await read(path + "?limit=100&after=" + encodeURIComponent(next));
      if (acceptLegacyArray && !next && Array.isArray(page)) return page;
      if (!Array.isArray(page?.items) || typeof page.next !== "string" ||
          cursors.has(page.next) || result.length + page.items.length > 10000) {
        throw new Error("Сервер вернул неверный каталог.");
      }
      result.push(...page.items);
      next = page.next;
      if (next) cursors.add(next);
    } while (next);
    return result;
  }
  const [markets, products] = await Promise.all([pages("/markets"), pages("/products", true)]);
  return { markets, products };
}

export function projectMapCatalog({ markets, products }, imageURL = () => "") {
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

export function projectCatalog({ markets, products }, imageURL = () => "") {
  const shops = markets.filter((shop) => shop.id && shop.sellerId && shop.name)
    .map((shop) => ({ ...shop, logo: imageURL(shop.logoURL), server: true }));
  const shopBySeller = new Map(shops.map((shop) => [shop.sellerId, shop.id]));
  return {
    shops,
    products: products.filter((product) => product.available === true &&
      shopBySeller.has(product.sellerId) && product.id && product.title &&
      Number.isFinite(product.price) && product.price >= 0)
      .map((product) => ({
        ...product, name: product.title, shopId: shopBySeller.get(product.sellerId),
        image: imageURL(product.imageURLs?.[0]), rating: product.ratingAvg,
      })),
  };
}

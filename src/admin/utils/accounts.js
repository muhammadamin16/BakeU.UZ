const normalized = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("ru-RU");
const phoneKey = (value) => String(value || "").replace(/\D/g, "");
export const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("ru-RU");

function uniqueName(rows, name) {
  if (!normalized(name)) return undefined;
  const matches = rows.filter(
    (row) => normalized(row.name) === normalized(name),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

// Old browser snapshots contain shops with owner names but no seller accounts.
// Keep all existing records and give each relationship a stable ID.
export function normalizeAccounts(state) {
  const customers = state.customers || [];
  const sellers = [...(state.sellers || [])];
  const shops = (state.shops || []).map((shop) => {
    let seller = sellers.find((row) => row.id === shop.sellerId);
    if (!seller && !shop.sellerId && phoneKey(shop.phone)) {
      seller = sellers.find(
        (row) =>
          phoneKey(row.phone) === phoneKey(shop.phone) &&
          normalized(row.name) === normalized(shop.owner),
      );
    }
    if (!seller) {
      seller = {
        id: shop.sellerId || `seller-${shop.id}`,
        name: shop.owner || "Продавец",
        phone: shop.phone || "",
        email: "",
        date: "",
        status: shop.status === "Заблокирован" ? "Заблокирован" : "Активен",
      };
      sellers.push(seller);
    }
    return { ...shop, sellerId: seller.id };
  });
  const linkShop = (row) => {
    const shop = row.shopId
      ? shops.find((item) => item.id === row.shopId)
      : uniqueName(shops, row.shop);
    return shop ? { ...row, shopId: shop.id } : row;
  };
  const orders = (state.orders || []).map((row) => {
    const order = linkShop(row);
    const customer = row.customerId
      ? customers.find((item) => item.id === row.customerId)
      : uniqueName(customers, row.customer);
    return customer ? { ...order, customerId: customer.id } : order;
  });
  const subscriptions = (state.subscriptions || []).map((row) => {
    const subscription = linkShop(row);
    const shop = shops.find((item) => item.id === subscription.shopId);
    const seller = row.sellerId
      ? sellers.find((item) => item.id === row.sellerId)
      : shop
        ? sellers.find((item) => item.id === shop.sellerId)
        : uniqueName(sellers, row.name);
    return seller ? { ...subscription, sellerId: seller.id } : subscription;
  });
  return {
    ...state,
    customers,
    sellers,
    shops,
    orders,
    products: (state.products || []).map(linkShop),
    subscriptions,
  };
}

export function upsertAdminRecord(state, key, item) {
  const previous = state[key].find((row) => row.id === item.id);
  const record = { ...previous, ...item };
  // Existing collection forms also accept names typed by hand. Relink only
  // when that field was deliberately changed, not when an account is renamed.
  for (const [label, id] of [
    ["shop", "shopId"],
    ["customer", "customerId"],
  ]) {
    if (
      previous &&
      record[label] !== previous[label] &&
      record[id] === previous[id]
    ) {
      delete record[id];
    }
  }
  if (key === "shops") {
    const seller = state.sellers.find((row) => row.id === record.sellerId);
    if (seller) record.owner = seller.name;
  }
  const next = {
    ...state,
    [key]: previous
      ? state[key].map((row) => (row.id === item.id ? record : row))
      : [record, ...state[key]],
  };
  if (key === "customers") {
    next.orders = state.orders.map((row) =>
      row.customerId === item.id ? { ...row, customer: record.name } : row,
    );
  }
  if (key === "sellers") {
    next.shops = state.shops.map((row) =>
      row.sellerId === item.id ? { ...row, owner: record.name } : row,
    );
    next.subscriptions = state.subscriptions.map((row) =>
      row.sellerId === item.id ? { ...row, name: record.name } : row,
    );
  }
  if (key === "shops") {
    for (const collection of ["products", "orders", "subscriptions"]) {
      next[collection] = state[collection].map((row) =>
        row.shopId === item.id
          ? {
              ...row,
              shop: record.name,
              ...(collection === "subscriptions" && record.sellerId
                ? { sellerId: record.sellerId, name: record.owner }
                : {}),
            }
          : row,
      );
    }
  }
  return normalizeAccounts(next);
}

export function removeAdminRecord(state, key, id) {
  if (key === "sellers" && state.shops.some((shop) => shop.sellerId === id)) {
    return state;
  }
  return { ...state, [key]: state[key].filter((row) => row.id !== id) };
}

export function mergeAdminState(persisted, current) {
  return normalizeAccounts(
    persisted
      ? { ...current, ...persisted, sellers: persisted.sellers || [] }
      : current,
  );
}

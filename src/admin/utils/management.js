import { normalizeAccounts, upsertAdminRecord } from "./accounts.js";
import { productPhoto, safeProductImage } from "./images.js";
import {
  pauseSubscriptionRecord,
  resumeSubscriptionRecord,
  subscriptionStatus,
} from "./subscriptions.js";

const labels = {
  name: "Имя / название",
  phone: "Телефон",
  email: "Email",
  login: "Логин",
  address: "Адрес",
  date: "Дата",
  status: "Статус",
  notes: "Заметка",
  shopId: "ID магазина",
  sellerId: "ID продавца",
  customerId: "ID покупателя",
  price: "Цена",
  total: "Сумма",
  category: "Категория",
  description: "Описание",
  image: "Фото",
  items: "Состав заказа",
  plan: "Тариф",
  paid: "Оплачено",
  until: "Действует до",
  freezeReason: "Причина заморозки",
};
export const collectionTitles = {
  customers: "Покупатели",
  sellers: "Продавцы",
  shops: "Магазины",
  products: "Товары",
  orders: "Заказы",
  subscriptions: "Подписки",
  applications: "Заявки",
  settings: "Настройки",
};
const transitions = {
  Новый: ["В работе", "Отменён"],
  "В работе": ["Доставлен", "Отменён"],
  Доставлен: [],
  Отменён: [],
};
export const nextOrderStatuses = (status) => transitions[status] || [];
export const matchesSearch = (row, query) =>
  Boolean(
    !query.trim() ||
      [
        "id",
        "name",
        "owner",
        "shop",
        "customer",
        "phone",
        "email",
        "login",
        "category",
        "plan",
        "status",
        "address",
        "notes",
        "title",
        "text",
        "actor",
        "action",
        "label",
        "reason",
      ].some((key) =>
        String(row[key] || "")
          .toLocaleLowerCase("ru-RU")
          .includes(query.trim().toLocaleLowerCase("ru-RU")),
      ) ||
      row.items?.some((item) =>
        String(item.name)
          .toLocaleLowerCase("ru-RU")
          .includes(query.trim().toLocaleLowerCase("ru-RU")),
      ),
  );
const restricted = (row) => row && row.status !== "Активен";
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .filter((key) => value[key] !== undefined)
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const sameValue = (left, right) =>
  JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

export function normalizeManagement(state, now = Date.now()) {
  const next = normalizeAccounts(state);
  const shops = new Map(next.shops.map((row) => [row.id, row]));
  const products = next.products.map((row) => ({
    ...row,
    sellerId: row.sellerId || shops.get(row.shopId)?.sellerId,
    image: productPhoto(row),
  }));
  const orders = next.orders.map((row) => ({
    ...row,
    sellerId: row.sellerId || shops.get(row.shopId)?.sellerId,
  }));
  return {
    ...next,
    products,
    orders,
    history: Array.isArray(next.history) ? next.history : [],
    subscriptions: next.subscriptions.map((row) => {
      const subscription = { ...row, status: subscriptionStatus(row, now) };
      const seller = next.sellers.find((person) => person.id === row.sellerId);
      return restricted(seller) &&
        ["Активна", "Скоро истекает"].includes(subscription.status)
        ? pauseSubscriptionRecord(subscription, now, `account:${seller.id}`)
        : subscription;
    }),
  };
}

export function scopeRecords(state, key, scope) {
  const rows = state[key] || [];
  const read = (name) =>
    typeof scope.get === "function" ? scope.get(name) : scope[name];
  const sellerId = read("sellerId"),
    customerId = read("customerId"),
    shopId = read("shopId");
  return rows.filter(
    (row) =>
      (!sellerId || row.sellerId === sellerId) &&
      (!customerId || row.customerId === customerId) &&
      (!shopId ||
        (key === "shops" ? row.id === shopId : row.shopId === shopId)) &&
      (read("excludeCancelled") !== "1" || row.status !== "Отменён"),
  );
}

export function shopRestriction(state, shopId, now = Date.now()) {
  const shop = state.shops.find((row) => row.id === shopId);
  if (!shop) return "Магазин не найден";
  const seller = state.sellers.find((row) => row.id === shop.sellerId);
  if (!seller || restricted(seller))
    return "Аккаунт продавца заморожен или заблокирован";
  if (shop.status !== "Открыт") return "Магазин заблокирован";
  if (
    shop.plan === "BakeU Pro" &&
    !state.subscriptions.some(
      (row) =>
        row.shopId === shop.id &&
        ["Активна", "Скоро истекает"].includes(subscriptionStatus(row, now)),
    )
  )
    return "Нет действующей подписки магазина";
  return "";
}

function summary(field, value) {
  if (field === "image") return value ? "Фото добавлено" : "Без фото";
  if (field === "items")
    return Array.isArray(value)
      ? value
          .map(
            (item) => `${item.name} × ${item.quantity} (${item.unitPrice} сум)`,
          )
          .join("; ") || "Без товаров"
      : "Не указан";
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}

function event(state, key, before, after, action, reason, now) {
  const record = after || before;
  const shop = state.shops.find((row) => row.id === record.shopId);
  const changes = Object.entries(labels)
    .filter(([field]) => !sameValue(before?.[field], after?.[field]))
    .map(([field, label]) => ({
      field: label,
      before:
        field === "image" && before?.image
          ? "Предыдущее изображение"
          : summary(field, before?.[field]),
      after:
        field === "image" && after?.image
          ? "Новое изображение"
          : summary(field, after?.[field]),
    }));
  return {
    id: crypto.randomUUID(),
    at: new Date(now).toISOString(),
    actor: state.settings.name,
    entity: key,
    entityId: record.id,
    label: record.name || record.customer || record.id,
    action,
    reason: reason || "",
    changes,
    sellerId: key === "sellers" ? record.id : record.sellerId || shop?.sellerId,
    customerId: key === "customers" ? record.id : record.customerId,
    shopId: key === "shops" ? record.id : record.shopId,
    productId: key === "products" ? record.id : undefined,
    orderId: key === "orders" ? record.id : undefined,
    subscriptionId: key === "subscriptions" ? record.id : undefined,
  };
}

function logged(state, key, before, after, action, reason, now) {
  const entry = event(state, key, before, after, action, reason, now);
  return { ...state, history: [entry, ...(state.history || [])] };
}

export function changeSubscription(
  state,
  id,
  action,
  reason = "",
  now = Date.now(),
) {
  const row = state.subscriptions.find((item) => item.id === id);
  if (!row) throw Error("Подписка не найдена");
  if (
    action === "pause" &&
    row.status !== "Приостановлена" &&
    String(reason || "").trim().length < 3
  )
    throw Error("Укажите причину приостановки");
  if (
    action === "resume" &&
    (!state.sellers.some((seller) => seller.id === row.sellerId) ||
      restricted(state.sellers.find((seller) => seller.id === row.sellerId)))
  )
    throw Error("Сначала проверьте и разморозьте аккаунт продавца");
  const next =
    action === "pause"
      ? pauseSubscriptionRecord(row, now)
      : action === "resume"
        ? resumeSubscriptionRecord(row, now)
        : null;
  if (!next) throw Error("Неизвестное действие с подпиской");
  if (next === row) return state;
  const result = {
    ...state,
    subscriptions: state.subscriptions.map((item) =>
      item.id === id ? next : item,
    ),
  };
  return logged(
    result,
    "subscriptions",
    row,
    next,
    action === "pause" ? "Подписка приостановлена" : "Подписка возобновлена",
    reason,
    now,
  );
}

export function changeAccountStatus(
  state,
  key,
  id,
  status,
  reason,
  now = Date.now(),
) {
  if (
    !["customers", "sellers"].includes(key) ||
    !["Активен", "Заморожен", "Заблокирован"].includes(status)
  )
    throw Error("Неизвестный статус аккаунта");
  const person = state[key].find((row) => row.id === id);
  if (!person) throw Error("Аккаунт не найден");
  if (person.status === status) return state;
  if (status !== "Активен" && String(reason || "").trim().length < 3)
    throw Error("Укажите причину заморозки");
  const nextPerson = {
    ...person,
    status,
    freezeReason: status === "Активен" ? "" : reason.trim(),
  };
  let next = {
    ...state,
    [key]: state[key].map((row) => (row.id === id ? nextPerson : row)),
  };
  if (key === "sellers") {
    for (const subscription of state.subscriptions.filter(
      (row) => row.sellerId === id,
    )) {
      if (
        status !== "Активен" &&
        ["Активна", "Скоро истекает"].includes(
          subscriptionStatus(subscription, now),
        )
      ) {
        const paused = pauseSubscriptionRecord(
          subscription,
          now,
          `account:${id}`,
        );
        next = {
          ...next,
          subscriptions: next.subscriptions.map((row) =>
            row.id === subscription.id ? paused : row,
          ),
        };
        next = logged(
          next,
          "subscriptions",
          subscription,
          paused,
          "Подписка приостановлена",
          "Заморозка аккаунта продавца",
          now,
        );
      } else if (
        status === "Активен" &&
        subscription.status === "Приостановлена" &&
        subscription.pauseReason === `account:${id}`
      ) {
        const resumed = resumeSubscriptionRecord(subscription, now);
        next = {
          ...next,
          subscriptions: next.subscriptions.map((row) =>
            row.id === subscription.id ? resumed : row,
          ),
        };
        next = logged(
          next,
          "subscriptions",
          subscription,
          resumed,
          "Подписка возобновлена",
          "Аккаунт продавца разморожен",
          now,
        );
      }
    }
  }
  return logged(
    next,
    key,
    person,
    nextPerson,
    status === "Активен" ? "Аккаунт разморожен" : "Аккаунт заморожен",
    reason,
    now,
  );
}

export function deleteRestriction(state, key, row) {
  if (
    key === "sellers" &&
    (state.shops.some((shop) => shop.sellerId === row.id) ||
      state.orders.some((order) => order.sellerId === row.id) ||
      state.subscriptions.some((sub) => sub.sellerId === row.id))
  )
    return "У продавца есть связанные записи. Используйте заморозку аккаунта.";
  if (
    key === "customers" &&
    state.orders.some((order) => order.customerId === row.id)
  )
    return "У покупателя есть заказы. Используйте заморозку аккаунта.";
  if (
    key === "shops" &&
    (state.orders.some((order) => order.shopId === row.id) ||
      state.products.some((product) => product.shopId === row.id) ||
      state.subscriptions.some((sub) => sub.shopId === row.id))
  )
    return "Сначала перенесите или удалите связанные записи магазина.";
  return "";
}

export function saveManagedRecord(state, key, item, now = Date.now()) {
  if (!Array.isArray(state[key]) || key === "history")
    throw Error("Эту коллекцию нельзя редактировать");
  const before = state[key].find((row) => row.id === item.id);
  const candidate = { ...before, ...item, id: item.id || crypto.randomUUID() };
  for (const field of [
    "password",
    "passwordHash",
    "hash",
    "salt",
    "token",
    "accessToken",
  ])
    delete candidate[field];
  if (
    ["customers", "sellers", "shops", "products"].includes(key) &&
    !String(candidate.name || "").trim()
  )
    throw Error("Укажите имя или название");
  if (candidate.shopId) {
    const shop = state.shops.find((row) => row.id === candidate.shopId);
    if (!shop && (!before || candidate.shopId !== before.shopId))
      throw Error("Выберите существующий магазин");
    if (shop) {
      candidate.shop = shop.name;
      candidate.sellerId =
        key === "orders" &&
        before?.shopId === candidate.shopId &&
        before.sellerId
          ? before.sellerId
          : shop.sellerId;
    }
  }
  if (key === "products") {
    if (
      !candidate.shopId ||
      candidate.price === "" ||
      candidate.price === undefined ||
      !Number.isFinite(Number(candidate.price)) ||
      Number(candidate.price) < 0
    )
      throw Error("Укажите магазин и корректную цену товара");
    if (!["На проверке", "Опубликован", "Скрыт"].includes(candidate.status))
      throw Error("Выберите статус товара");
    if (candidate.image && !safeProductImage(candidate.image))
      throw Error(
        "Для фото используйте HTTPS, путь /images/ или загрузите изображение",
      );
    if (
      candidate.status === "Опубликован" &&
      (!before ||
        before.status !== candidate.status ||
        before.shopId !== candidate.shopId)
    ) {
      const restriction = shopRestriction(state, candidate.shopId, now);
      if (restriction) throw Error(restriction);
    }
  }
  if (key === "orders") {
    const customer = state.customers.find(
      (row) => row.id === candidate.customerId,
    );
    if (!customer || !candidate.shopId)
      throw Error("Выберите покупателя и магазин");
    candidate.customer = customer.name;
    const addsWork =
      !before ||
      before.customerId !== candidate.customerId ||
      before.shopId !== candidate.shopId ||
      candidate.items?.some((line) => {
        const old = before.items?.find(
          (item) => item.productId === line.productId,
        );
        return !old || Number(line.quantity) > Number(old.quantity);
      });
    if (addsWork) {
      if (restricted(customer))
        throw Error("Аккаунт покупателя заморожен или заблокирован");
      const restriction = shopRestriction(state, candidate.shopId, now);
      if (restriction) throw Error(restriction);
    }
    if (before?.items?.length && !candidate.items?.length)
      throw Error(
        "Заказ с товарами не может быть пустым. Для отмены используйте статус заказа.",
      );
    if (!before) {
      if (!Array.isArray(candidate.items) || !candidate.items.length)
        throw Error("Добавьте товары в заказ");
      candidate.status = "Новый";
    } else if (
      candidate.status !== before.status &&
      !nextOrderStatuses(before.status).includes(candidate.status)
    )
      throw Error("Недопустимый переход статуса заказа");
    if (
      before &&
      ["Доставлен", "Отменён"].includes(before.status) &&
      ["items", "total", "shopId", "customerId"].some(
        (field) => !sameValue(candidate[field], before[field]),
      )
    )
      throw Error("Состав и сумма завершённого заказа не изменяются");
    if (Array.isArray(candidate.items) && candidate.items.length) {
      const seen = new Set();
      candidate.items = candidate.items.map((line) => {
        if (seen.has(line.productId))
          throw Error("Товар добавлен в заказ дважды");
        seen.add(line.productId);
        if (
          !Number.isInteger(Number(line.quantity)) ||
          Number(line.quantity) < 1 ||
          Number(line.quantity) > 9999
        )
          throw Error("Проверьте количество товаров");
        const product = state.products.find((row) => row.id === line.productId);
        const existing =
          before?.shopId === candidate.shopId &&
          before?.items?.find((item) => item.productId === line.productId);
        if (
          !existing &&
          (!product ||
            product.shopId !== candidate.shopId ||
            product.status !== "Опубликован")
        )
          throw Error("Товар недоступен для нового заказа");
        const source = existing || product;
        const unitPrice = Number(existing ? source.unitPrice : source.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0)
          throw Error("Проверьте цену товара");
        return {
          productId: line.productId,
          name: source.name,
          image: source.image || "",
          shopId: candidate.shopId,
          quantity: Number(line.quantity),
          unitPrice,
        };
      });
      candidate.total = candidate.items.reduce(
        (sum, line) => sum + line.quantity * line.unitPrice,
        0,
      );
    }
    if (
      !Number.isFinite(Number(candidate.total)) ||
      Number(candidate.total) < 0
    )
      throw Error("Проверьте сумму заказа");
  }
  if (key === "subscriptions") {
    if (
      !candidate.shopId ||
      !candidate.until ||
      !Number.isFinite(Number(candidate.paid)) ||
      Number(candidate.paid) < 0
    )
      throw Error("Укажите магазин, срок и корректную оплату");
    candidate.name =
      state.sellers.find((row) => row.id === candidate.sellerId)?.name ||
      candidate.name;
    if (before?.until !== candidate.until) {
      delete candidate.expiresAt;
      if (before?.status === "Приостановлена") {
        candidate.remainingMs =
          new Date(`${candidate.until}T23:59:59.999`).getTime() - now;
        if (!(candidate.remainingMs > 0))
          throw Error("Новый срок должен быть в будущем");
      }
    }
    candidate.status = subscriptionStatus(candidate, now);
    if (
      (!before || before.until !== candidate.until) &&
      candidate.status === "Истекла"
    )
      throw Error("Укажите срок подписки в будущем");
    if (
      restricted(state.sellers.find((row) => row.id === candidate.sellerId)) &&
      candidate.status !== "Приостановлена"
    )
      throw Error("Сначала разморозьте аккаунт продавца");
    if (
      before?.status === "Приостановлена" &&
      candidate.status !== "Приостановлена"
    )
      throw Error("Для возобновления используйте действие подписки");
    if (!before && candidate.status === "Приостановлена")
      throw Error("Сначала создайте подписку, затем приостановите её");
  }
  const account = ["customers", "sellers"].includes(key);
  const desiredStatus = account ? candidate.status || "Активен" : undefined;
  let next = upsertAdminRecord(
    state,
    key,
    account ? { ...candidate, status: before?.status || "Активен" } : candidate,
  );
  if (
    key === "subscriptions" &&
    (!before ||
      candidate.shopId !== before.shopId ||
      candidate.plan !== before.plan)
  )
    next = {
      ...next,
      shops: next.shops.map((shop) =>
        shop.id === candidate.shopId ? { ...shop, plan: candidate.plan } : shop,
      ),
    };
  next = normalizeManagement(next, now);
  const saved = next[key].find((row) => row.id === candidate.id);
  if (
    !before ||
    Object.keys(labels).some((field) => !sameValue(before[field], saved[field]))
  )
    next = logged(
      next,
      key,
      before,
      saved,
      before ? "Запись изменена" : "Запись создана",
      "",
      now,
    );
  if (account && saved.status !== desiredStatus)
    next = changeAccountStatus(
      next,
      key,
      saved.id,
      desiredStatus,
      candidate.freezeReason ||
        candidate.notes ||
        "Статус изменён администратором",
      now,
    );
  return next;
}

export function removeManagedRecord(state, key, id, now = Date.now()) {
  if (!Array.isArray(state[key]) || key === "history")
    throw Error("Эту запись нельзя удалить");
  const record = state[key].find((row) => row.id === id);
  if (!record) return state;
  const restriction = deleteRestriction(state, key, record);
  if (restriction) throw Error(restriction);
  const next = { ...state, [key]: state[key].filter((row) => row.id !== id) };
  return logged(next, key, record, undefined, "Запись удалена", "", now);
}

export function decideApplication(
  state,
  id,
  status,
  now = Date.now(),
  reason = "",
) {
  const application = state.applications.find((row) => row.id === id);
  if (!application || application.status !== "На проверке") return state;
  if (!["Одобрено", "Отклонено"].includes(status))
    throw Error("Неизвестное решение");
  let after = { ...application, status };
  const next = normalizeManagement(
    {
      ...state,
      applications: state.applications.map((row) =>
        row.id === id ? after : row,
      ),
      shops:
        status === "Одобрено"
          ? [
              {
                id: `shop-${id}`,
                name: application.shop,
                owner: application.name,
                phone: application.phone,
                address: "",
                status: "Открыт",
                plan: "Без подписки",
              },
              ...state.shops,
            ]
          : state.shops,
      notifications: [
        {
          id: crypto.randomUUID(),
          title: status === "Одобрено" ? "Магазин открыт" : "Заявка отклонена",
          text: `Магазин «${application.shop}»: ${status.toLowerCase()}`,
          time: "Только что",
          read: false,
        },
        ...state.notifications,
      ],
    },
    now,
  );
  if (status === "Одобрено") {
    const shop = next.shops.find((row) => row.id === `shop-${id}`);
    after = { ...after, shopId: shop.id, sellerId: shop.sellerId };
    next.applications = next.applications.map((row) =>
      row.id === id ? after : row,
    );
  }
  return logged(
    next,
    "applications",
    application,
    after,
    status === "Одобрено" ? "Заявка одобрена" : "Заявка отклонена",
    reason,
    now,
  );
}

export function historyFor(state, scope) {
  return (state.history || []).filter((entry) =>
    Object.entries(scope).every(
      ([key, value]) => !value || entry[key] === value,
    ),
  );
}

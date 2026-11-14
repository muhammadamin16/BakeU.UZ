export const PRODUCT_CATEGORIES = [
  "Торты",
  "Салаты",
  "Пирожные",
  "Капкейки",
  "Десерты",
  "Печенье",
  "Хлеб",
  "Самса",
  "Пироги",
  "Сладости",
  "Другое",
];
export const categoryFields = (category) => {
  if (category === "Торты" || category === "Пироги")
    return ["weight", "diameter", "servings", "filling"];
  if (category === "Салаты") return ["weight", "servings"];
  if (["Пирожные", "Капкейки", "Печенье", "Сладости"].includes(category))
    return ["weight", "pieces", "filling"];
  if (category === "Самса") return ["weight", "pieces", "filling"];
  if (category === "Хлеб") return ["weight"];
  return ["weight", "servings", "pieces"];
};
export const fieldLabels = {
  weight: "Вес, г",
  diameter: "Диаметр, см",
  servings: "Количество порций",
  pieces: "Штук в наборе",
  filling: "Начинка",
};
const demo = {
  cake: {
    description:
      "Шоколадный торт с нежным кремом, клубникой и шоколадным декором. Подойдёт для семейного чаепития или праздника.",
    ingredients:
      "Пшеничная мука, яйца, молоко, сливочное масло, какао, сахар, клубника.",
    allergens: "Глютен, яйца, молоко. Возможны следы орехов.",
    storage: "В холодильнике при +2…+6 °C, до 48 часов.",
    leadTime: "По предварительному заказу за 24 часа",
    variants: [
      {
        id: "base",
        label: "1 кг · 6–8 порций",
        price: 45000,
        weight: 1000,
        diameter: 18,
        servings: "6–8",
        filling: "Шоколадная",
      },
      {
        id: "large",
        label: "2 кг · 12–16 порций",
        price: 90000,
        weight: 2000,
        diameter: 24,
        servings: "12–16",
        filling: "Шоколадная",
      },
    ],
  },
  cookie: {
    description:
      "Домашнее печенье с кусочками шоколада: хрустящее снаружи и мягкое внутри.",
    ingredients: "Пшеничная мука, сливочное масло, яйца, сахар, шоколад.",
    allergens: "Глютен, молоко, яйца.",
    storage: "В закрытой упаковке, до 5 дней.",
    variants: [
      { id: "base", label: "Набор 6 шт.", price: 13200, pieces: 6 },
      { id: "dozen", label: "Набор 12 шт.", price: 26400, pieces: 12 },
    ],
  },
  bread: {
    description: "Свежий домашний хлеб с румяной корочкой и мягким мякишем.",
    ingredients: "Пшеничная мука, вода, дрожжи, соль.",
    allergens: "Глютен.",
    storage: "В сухом месте, до 2 дней.",
    weight: 450,
    unit: "шт.",
  },
  somsa: {
    description:
      "Слоёная самса с сочной мясной начинкой. Приготовление и время выдачи уточняйте у пекаря.",
    ingredients: "Пшеничная мука, говядина, лук, масло, соль, специи.",
    allergens: "Глютен.",
    filling: "Говядина и лук",
    weight: 120,
    unit: "шт.",
  },
};
export function detailsFor(p) {
  const d = demo[p.id] || {};
  return {
    ...d,
    ...p,
    variants: p.variants?.length ? p.variants : d.variants || [],
    demoDetails: !!demo[p.id],
  };
}
export function cartSelection(p, v) {
  const id = v && v.id !== "base" ? p.id + "::" + v.id : p.id;
  return {
    ...p,
    id,
    productId: p.id,
    price: Number(v?.price ?? p.price),
    variantLabel: v?.label || "",
    unit: p.unit || "шт.",
  };
}

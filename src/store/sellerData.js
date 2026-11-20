import { PRODUCT_CATEGORIES } from "../pages/Product/productDetails";
import { useShopStore } from "./shopStore";
const DEMO_BAKERIES = [
  { id: "anhor", name: "Anhor Bakery", initials: "AB", color: "#ecd4b7", specialty: "Хлеб", image: "bread", items: [["Пшеничный хлеб", 8500], ["Хлеб на закваске", 18000]] },
  { id: "bodom", name: "Bodom Bakes", initials: "BB", color: "#ead6c9", specialty: "Печенье", image: "cookie", items: [["Миндальное печенье", 22000], ["Песочное печенье", 17000]] },
  { id: "rayhon", name: "Rayhon Tandir", initials: "RT", color: "#dddcc8", specialty: "Самса", image: "somsa", items: [["Самса с говядиной", 11000], ["Самса с тыквой", 8000]] },
  { id: "zarafshon", name: "Zarafshon Cakes", initials: "ZC", color: "#efd5d7", specialty: "Торты", image: "cake", items: [["Бисквитный торт", 82000], ["Торт с шоколадным кремом", 99000]] },
  { id: "navbahor", name: "Navbahor Non", initials: "NN", color: "#eadbc0", specialty: "Хлеб", image: "bread", items: [["Ржаной хлеб", 13000], ["Пшеничная буханка", 10500]] },
  { id: "vanil", name: "Vanil Studio", initials: "VS", color: "#e6d9ef", specialty: "Торты", image: "cake", items: [["Ванильный торт", 87000], ["Торт с какао", 94000]] },
  { id: "asal", name: "Asal Cookies", initials: "AC", color: "#f0ddbe", specialty: "Печенье", image: "cookie", items: [["Медовое печенье", 19000], ["Печенье с орехами", 24500]] },
  { id: "chashma", name: "Chashma Tandir", initials: "CT", color: "#ede0cb", specialty: "Самса", image: "somsa", items: [["Самса с курицей", 9500], ["Самса с картофелем", 7500]] },
  { id: "dolchin", name: "Dolchin Bakery", initials: "DB", color: "#e5cbb8", specialty: "Печенье", image: "cookie", items: [["Печенье с корицей", 18000], ["Овсяное печенье", 16000]] },
  { id: "zamin", name: "Zamin Bread", initials: "ZB", color: "#dfd7c1", specialty: "Хлеб", image: "bread", items: [["Цельнозерновой хлеб", 16000], ["Хлеб с семенами", 17500]] },
  { id: "nilufar", name: "Nilufar Sweets", initials: "NS", color: "#eed6e3", specialty: "Торты", image: "cake", items: [["Шоколадный бисквит", 76000], ["Торт с ванильным кремом", 89000]] },
  { id: "samar", name: "Samar Tandir", initials: "ST", color: "#f0d6b9", specialty: "Самса", image: "somsa", items: [["Слоёная самса", 10000], ["Самса с зеленью", 8500]] },
];

export const products = [
  {
    id: "cake",
    name: "Шоколадный торт",
    category: "Торты",
    price: 45000,
    image: "/images/products/cake.jpg",
    shopId: "shahzoda",
  },
  {
    id: "cookie",
    name: "Домашнее печенье",
    category: "Печенье",
    price: 13200,
    image: "/images/products/cookie.jpg",
    shopId: "sweet-home",
  },
  {
    id: "bread",
    name: "Домашний хлеб",
    category: "Хлеб",
    price: 3400,
    image: "/images/products/bread.jpg",
    images: [
      "/images/products/bread-crust.webp",
      "/images/products/bread-crumb.webp",
    ],
    shopId: "bakeu",
  },
  {
    id: "somsa",
    name: "Самса",
    category: "Самса",
    price: 7000,
    image: "/images/products/somsa.jpg",
    shopId: "bakeu",
  },
  ...DEMO_BAKERIES.flatMap(({ id, specialty, image, items }) =>
    items.map(([name, price], index) => ({
      id: `demo-${id}-${index + 1}`,
      name,
      category: specialty,
      price,
      image: `/images/products/${image}.jpg`,
      shopId: `demo-${id}`,
    })),
  ),
];

// Демо-маълумотлар: телефон, username, манзил ва координаталарни ҳақиқийсига алмаштиринг
export const shops = [
  {
    id: "shahzoda",
    demo: true,
    name: "Shahzoda Family",
    initials: "SF",
    logo: "",
    color: "#ead9bd",
    description:
      "Торты и десерты для семейных праздников и особенных моментов.",
    about:
      "Готовим торты на заказ для дней рождения, свадеб и семейных встреч. Используем натуральное масло, свежие ягоды и бельгийский шоколад. Индивидуальный дизайн обсуждаем в чате.",
    rating: "5.0",
    reviewsCount: 24,
    phone: "+998 90 123 45 67",
    telegram: "shahzoda_family",
    instagram: "shahzoda.family",
    address: "г. Ташкент, Мирзо-Улугбекский район",
    lat: 41.3111,
    lng: 69.2797,
    hours: "Ежедневно, 09:00–20:00",
    reviews: [
      {
        id: 1,
        author: "Мадина",
        rating: 5,
        date: "2 недели назад",
        text: "Красивый торт и нежный вкус. Отлично подошёл для нашего праздника!",
      },
      {
        id: 2,
        author: "Дильшод",
        rating: 5,
        date: "месяц назад",
        text: "Заказывал на юбилей мамы. Всё привезли вовремя, гости были в восторге.",
      },
    ],
  },
  {
    id: "sweet-home",
    demo: true,
    name: "Sweet Home",
    initials: "SH",
    logo: "",
    color: "#e9d8df",
    description: "Домашнее печенье и сладкие дополнения к любимому чаю.",
    about:
      "Небольшая домашняя кондитерская. Печём печенье по семейным рецептам, без консервантов. Принимаем заказы на подарочные наборы.",
    rating: "4.9",
    reviewsCount: 18,
    phone: "+998 91 234 56 78",
    telegram: "sweethome_uz",
    instagram: "sweethome.uz",
    address: "г. Ташкент, Юнусабадский район",
    lat: 41.364,
    lng: 69.287,
    hours: "Пн–Сб, 10:00–19:00",
    reviews: [
      {
        id: 1,
        author: "Азиза",
        rating: 5,
        date: "неделю назад",
        text: "Очень вкусное печенье. Заказывали к семейному чаепитию.",
      },
    ],
  },
  {
    id: "bakeu",
    demo: true,
    name: "BakeU Bakery",
    initials: "BU",
    logo: "",
    color: "#dce5d4",
    description:
      "Домашний хлеб и сытная выпечка для уютных завтраков и обедов.",
    about:
      "Свежий хлеб и самса каждое утро. Выпекаем в тандыре и духовке, тесто готовим сами. Доставка по городу или самовывоз.",
    rating: "4.8",
    reviewsCount: 32,
    phone: "+998 93 345 67 89",
    telegram: "bakeu_bakery",
    instagram: "bakeu.bakery",
    address: "г. Ташкент, Чиланзарский район",
    lat: 41.275,
    lng: 69.204,
    hours: "Ежедневно, 07:00–21:00",
    reviews: [
      {
        id: 1,
        author: "Сардор",
        rating: 5,
        date: "3 дня назад",
        text: "Понравились хлеб и самса. Обязательно попробуем ещё.",
      },
      {
        id: 2,
        author: "Нилуфар",
        rating: 4,
        date: "месяц назад",
        text: "Самса горячая и сочная. Хотелось бы побольше вариантов начинки.",
      },
    ],
  },
  ...DEMO_BAKERIES.map(({ id, name, initials, color, specialty }) => ({
    id: `demo-${id}`,
    demo: true,
    name: `${name} · Demo`,
    initials,
    color,
    description: specialty,
    about: "Демо-магазин",
    reviewsCount: 0,
    reviews: [],
    address: "Ташкент",
    lat: 41.3111,
    lng: 69.2797,
  })),
];

export const categories = ["Все", ...PRODUCT_CATEGORIES];

export const getShop = (id) =>
  useShopStore.getState().shops[id] || shops.find((s) => s.id === id);
export function useCatalog() {
  const localShops = useShopStore((s) => s.shops);
  const localProducts = useShopStore((s) => s.products);
  return {
    shops: [...shops, ...Object.values(localShops)],
    products: [
      ...products,
      ...Object.values(localProducts).filter(
        (p) => localShops[p.shopId] && p.available !== false,
      ),
    ],
  };
}

export const getMapLinks = (shop) => ({
  embed: `https://www.google.com/maps?q=${shop.lat},${shop.lng}&z=15&output=embed`,
  google: `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`,
  route: `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`,
  yandex: `https://yandex.com/maps/?pt=${shop.lng},${shop.lat}&z=16&l=map`,
});

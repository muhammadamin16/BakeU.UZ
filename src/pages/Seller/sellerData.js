export const products = [
  { id: "cake", name: "Шоколадный торт", category: "Торты", price: 45000, image: "/images/products/cake.jpg", shopId: "shahzoda" },
  { id: "cookie", name: "Домашнее печенье", category: "Печенье", price: 13200, image: "/images/products/cookie.jpg", shopId: "sweet-home" },
  { id: "bread", name: "Домашний хлеб", category: "Хлеб", price: 3400, image: "/images/products/bread.jpg", shopId: "bakeu" },
  { id: "somsa", name: "Самса", category: "Самса", price: 7000, image: "/images/products/somsa.jpg", shopId: "bakeu" },
];

// Демо-маълумотлар: телефон, username ва манзилни ҳақиқийсига алмаштиринг
export const shops = [
  {
    id: "shahzoda",
    name: "Shahzoda Family",
    initials: "SF",
    logo: "",
    color: "#ead9bd",
    description: "Торты и десерты для семейных праздников и особенных моментов.",
    about:
      "Готовим торты на заказ для дней рождения, свадеб и семейных встреч. Используем натуральное масло, свежие ягоды и бельгийский шоколад. Индивидуальный дизайн обсуждаем в чате.",
    rating: "5.0",
    reviewsCount: 24,
    phone: "+998 90 123 45 67",
    telegram: "shahzoda_family",
    instagram: "shahzoda.family",
    address: "г. Ташкент, Мирзо-Улугбекский район",
    mapUrl: "https://www.google.com/maps?q=41.3111,69.2797",
    hours: "Ежедневно, 09:00–20:00",
    reviews: [
      { id: 1, author: "Мадина", rating: 5, date: "2 недели назад", text: "Красивый торт и нежный вкус. Отлично подошёл для нашего праздника!" },
      { id: 2, author: "Дильшод", rating: 5, date: "месяц назад", text: "Заказывал на юбилей мамы. Всё привезли вовремя, гости были в восторге." },
    ],
  },
  {
    id: "sweet-home",
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
    mapUrl: "https://www.google.com/maps?q=41.3640,69.2870",
    hours: "Пн–Сб, 10:00–19:00",
    reviews: [
      { id: 1, author: "Азиза", rating: 5, date: "неделю назад", text: "Очень вкусное печенье. Заказывали к семейному чаепитию." },
    ],
  },
  {
    id: "bakeu",
    name: "BakeU Bakery",
    initials: "BU",
    logo: "",
    color: "#dce5d4",
    description: "Домашний хлеб и сытная выпечка для уютных завтраков и обедов.",
    about:
      "Свежий хлеб и самса каждое утро. Выпекаем в тандыре и духовке, тесто готовим сами. Доставка по городу или самовывоз.",
    rating: "4.8",
    reviewsCount: 32,
    phone: "+998 93 345 67 89",
    telegram: "bakeu_bakery",
    instagram: "bakeu.bakery",
    address: "г. Ташкент, Чиланзарский район",
    mapUrl: "https://www.google.com/maps?q=41.2750,69.2040",
    hours: "Ежедневно, 07:00–21:00",
    reviews: [
      { id: 1, author: "Сардор", rating: 5, date: "3 дня назад", text: "Понравились хлеб и самса. Обязательно попробуем ещё." },
      { id: 2, author: "Нилуфар", rating: 4, date: "месяц назад", text: "Самса горячая и сочная. Хотелось бы побольше вариантов начинки." },
    ],
  },
];

export const categories = ["Все", "Торты", "Печенье", "Хлеб", "Самса"];
export const getShop = (id) => shops.find((s) => s.id === id);
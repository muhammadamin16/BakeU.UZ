export const mainNavigation = [
  { to: "/", label: "Главная", end: true },
  { to: "/catalog", label: "Каталог", end: false },
  { to: "/cart", label: "Корзина", end: false },
  { to: "/orders", label: "Заказы", end: false },
  { to: "/profile", label: "Профиль", end: false },
] as const;

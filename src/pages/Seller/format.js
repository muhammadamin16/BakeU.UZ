import { getLocale } from "../../i18n/index.js";
export const formatPrice = (price) =>
  `${price.toLocaleString(getLocale())} сум`;
export const shopUrl = (id) => `?shop=${encodeURIComponent(id)}`;

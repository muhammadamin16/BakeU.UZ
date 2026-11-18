import { getLocale, translateText } from "../../i18n/index.js";
export const formatPrice = (price) =>
  `${price.toLocaleString(getLocale())} ${translateText("сум")}`;
export const shopUrl = (id) => `?shop=${encodeURIComponent(id)}`;

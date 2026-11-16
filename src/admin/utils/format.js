import { getLocale } from "../../i18n/index.js";
export const money = (value) =>
  Number(value).toLocaleString(getLocale()) + " сум";
export const date = (value) =>
  value ? new Date(value + "T12:00:00").toLocaleDateString(getLocale()) : "—";

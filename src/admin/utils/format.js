export const money = (value) => Number(value).toLocaleString("ru-RU") + " сум";
export const date = (value) =>
  value ? new Date(value + "T12:00:00").toLocaleDateString("ru-RU") : "—";

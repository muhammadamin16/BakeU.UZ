export function validateProductDetails(p) {
  const variants = p.variants || [];
  if (
    variants.some(
      (v) =>
        !v.label?.trim() ||
        !Number.isFinite(Number(v.price)) ||
        Number(v.price) <= 0,
    )
  )
    return "Заполните название и цену каждого варианта.";
  for (const item of [p, ...variants])
    for (const k of ["weight", "diameter", "pieces"])
      if (
        item[k] !== undefined &&
        item[k] !== "" &&
        (!Number.isFinite(Number(item[k])) || Number(item[k]) <= 0)
      )
        return "Вес, диаметр и количество должны быть больше нуля.";
  return "";
}

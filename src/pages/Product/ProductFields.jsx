import { categoryFields, fieldLabels } from "./productDetails";
import { readPicture } from "../../store/shopStore";
import "./Product.css";
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
export default function ProductFields({ value: p, onChange: set, onError }) {
  const fields = categoryFields(p.category);
  const update = (key, value) => set((old) => ({ ...old, [key]: value }));
  const variants = p.variants || [];
  const changeVariant = (id, key, value) =>
    update(
      "variants",
      variants.map((v) => (v.id === id ? { ...v, [key]: value } : v)),
    );
  const specs = (item, change) =>
    fields.map((key) => (
      <label className="bw-field" key={key}>
        {fieldLabels[key]}
        <input
          type={
            ["weight", "diameter", "pieces"].includes(key) ? "number" : "text"
          }
          min="0.01"
          step="any"
          value={item[key] || ""}
          onChange={(e) => change(key, e.target.value)}
        />
      </label>
    ));
  return (
    <>
      <div className="bw-fields">
        <label className="bw-field">
          Цена указана за
          <select
            value={p.unit || "шт."}
            onChange={(e) => update("unit", e.target.value)}
          >
            {["шт.", "кг", "порцию", "набор", "упаковку"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        {specs(p, update)}
      </div>
      <div className="bw-fields">
        {[
          ["ingredients", "Состав"],
          ["allergens", "Аллергены"],
          ["storage", "Хранение и срок годности"],
          ["leadTime", "Срок приготовления"],
          ["delivery", "Доставка и самовывоз"],
        ].map(([key, label]) => (
          <label className="bw-field" key={key}>
            {label}
            <textarea
              maxLength={1000}
              value={p[key] || ""}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="pd-editor-variants">
        <h4>Варианты товара</h4>
        <p>
          Для каждого варианта укажите итоговую цену. Первый вариант — основной.
          Пустые характеристики не показываются.
        </p>
        {variants.map((v, i) => (
          <div key={v.id}>
            <div className="bw-fields">
              <label className="bw-field">
                Вариант {i + 1}
                <input
                  required
                  value={v.label}
                  placeholder="Например: 2 кг · 12 порций"
                  onChange={(e) => changeVariant(v.id, "label", e.target.value)}
                />
              </label>
              <label className="bw-field">
                Цена варианта, сум
                <input
                  required
                  type="number"
                  min="1"
                  value={v.price}
                  onChange={(e) => changeVariant(v.id, "price", e.target.value)}
                />
              </label>
              {specs(v, (key, val) => changeVariant(v.id, key, val))}
            </div>
            <button
              className="bw-btn"
              type="button"
              onClick={() =>
                update(
                  "variants",
                  variants.filter((x) => x.id !== v.id),
                )
              }
            >
              Удалить вариант
            </button>
          </div>
        ))}
        <button
          className="bw-btn"
          type="button"
          onClick={() =>
            update("variants", [
              ...variants,
              { id: crypto.randomUUID(), label: "", price: p.price },
            ])
          }
        >
          + Добавить вариант
        </button>
      </div>
      <label className="bw-field">
        Дополнительные фото · до 4
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            if ((p.images || []).length + files.length > 4) {
              onError("Можно добавить до 4 дополнительных фотографий.");
              return;
            }
            try {
              const images = await Promise.all(files.map(readPicture));
              set((old) => ({
                ...old,
                images: [...(old.images || []), ...images],
              }));
            } catch (err) {
              onError(err.message);
            }
          }}
        />
      </label>
      <div className="pd-thumbs">
        {(p.images || []).map((src, i) => (
          <button
            key={i}
            type="button"
            aria-label={"Удалить фото " + (i + 1)}
            onClick={() =>
              update(
                "images",
                p.images.filter((_, n) => n !== i),
              )
            }
          >
            <img src={src} alt={"Дополнительное фото " + (i + 1)} />
            Удалить
          </button>
        ))}
      </div>
    </>
  );
}

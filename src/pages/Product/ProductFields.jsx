import { translateText } from "../../i18n/index.js";
import { categoryFields, fieldLabels } from "./productDetails.js";
import { readPicture } from "../../store/shopStore";
import "./Product.css";
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
        {translateText(fieldLabels[key])}
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
          {translateText("Цена указана за")}
          <select
            value={p.unit || "шт."}
            onChange={(e) => update("unit", e.target.value)}
          >
            {["шт.", "кг", "порцию", "набор", "упаковку"].map((x) => (
              <option value={x} key={x}>
                {translateText(x)}
              </option>
            ))}
          </select>
        </label>
        {translateText(specs(p, update))}
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
            {translateText(label)}
            <textarea
              maxLength={1000}
              value={p[key] || ""}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="pd-editor-variants">
        <h4>{translateText("Варианты товара")}</h4>
        <p>
          {translateText(
            "Для каждого варианта укажите итоговую цену. Первый вариант — основной. Пустые характеристики не показываются.",
          )}
        </p>
        {variants.map((v, i) => (
          <div key={v.id}>
            <div className="bw-fields">
              <label className="bw-field">
                {translateText("Вариант ")}
                {translateText(i + 1)}
                <input
                  required
                  value={v.label}
                  placeholder={translateText("Например: 2 кг · 12 порций")}
                  onChange={(e) => changeVariant(v.id, "label", e.target.value)}
                />
              </label>
              <label className="bw-field">
                {translateText("Цена варианта, сум")}
                <input
                  required
                  type="number"
                  min="1"
                  value={v.price}
                  onChange={(e) => changeVariant(v.id, "price", e.target.value)}
                />
              </label>
              {translateText(
                specs(v, (key, val) => changeVariant(v.id, key, val)),
              )}
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
              {translateText("Удалить вариант")}
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
          {translateText("+ Добавить вариант")}
        </button>
      </div>
      <label className="bw-field">
        {translateText("Дополнительные фото · до 4")}
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
            aria-label={translateText("Удалить фото " + (i + 1))}
            onClick={() =>
              update(
                "images",
                p.images.filter((_, n) => n !== i),
              )
            }
          >
            <img
              src={src}
              alt={translateText("Дополнительное фото " + (i + 1))}
            />
            {translateText("Удалить")}
          </button>
        ))}
      </div>
    </>
  );
}

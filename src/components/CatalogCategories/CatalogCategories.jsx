import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { translateText as t } from "../../i18n/index.js";
import { categories } from "../../store/sellerData";
import "./CatalogCategories.css";

const PREVIEW_COUNT = 5;
const ICONS = { "Все": "✦", "Торты": "🍰", "Печенье": "🍪", "Хлеб": "🥖", "Самса": "🥟" };

export default function CatalogCategories({ products, value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const groupId = useId();
  const counts = new Map();
  for (const { category } of products) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  counts.set("Все", products.length);

  const ordered = categories.toSorted((first, second) =>
    Number(counts.has(second)) - Number(counts.has(first)),
  );
  const preview = ordered.slice(0, PREVIEW_COUNT);
  const displayed = expanded ? ordered : ordered.filter((item) => preview.includes(item) || item === value);

  return (
    <div className="catalog-categories">
      <div id={groupId} className="catalog-categories__options" role="group" aria-label={t("Категории товаров")}>
        {displayed.map((item) => (
          <button
            key={item}
            type="button"
            className="catalog-categories__option"
            aria-pressed={value === item}
            onClick={() => onChange(item)}
          >
            <span aria-hidden="true">{ICONS[item] || "•"}</span>
            {t(item)}
            <span className="catalog-categories__count">{counts.get(item) ?? 0}</span>
          </button>
        ))}
      </div>
      {ordered.length > PREVIEW_COUNT && (
        <button
          type="button"
          className="catalog-categories__toggle"
          aria-controls={groupId}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {t(expanded ? "Свернуть категории" : "Больше категорий")}
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

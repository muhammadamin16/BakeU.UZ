import { useId, useState } from "react";
import {
  Cake, CakeSlice, Candy, ChevronDown, Cookie, Cupcake, Dessert, LayoutGrid,
  Pizza, Salad, Sandwich, Shapes, Wheat,
} from "lucide-react";
import { translateText as t } from "../../i18n/index.js";
import { categories } from "../../store/sellerData";
import "./CatalogCategories.css";

const PREVIEW_COUNT = 5;
const ICONS = {
  "Все": LayoutGrid,
  "Торты": Cake,
  "Салаты": Salad,
  "Пирожные": CakeSlice,
  "Капкейки": Cupcake,
  "Десерты": Dessert,
  "Печенье": Cookie,
  "Хлеб": Wheat,
  "Самса": Sandwich,
  "Пироги": Pizza,
  "Сладости": Candy,
  "Другое": Shapes,
};

function CategoryOption({ item, count, selected, onChange }) {
  const Icon = ICONS[item] ?? Shapes;
  return (
    <button
      type="button"
      className="catalog-categories__option"
      aria-pressed={selected}
      onClick={() => onChange(item)}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      {t(item)}
      <span className="catalog-categories__count">{count}</span>
    </button>
  );
}

export default function CatalogCategories({ products, value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const extraId = useId();
  const counts = new Map();
  for (const { category } of products) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  counts.set("Все", products.length);

  const ordered = [...categories].sort((first, second) =>
    Number(counts.has(second)) - Number(counts.has(first)),
  );
  const preview = ordered.slice(0, PREVIEW_COUNT);
  const extra = ordered.slice(PREVIEW_COUNT);
  const shownInPreview = !expanded && extra.includes(value) ? [...preview, value] : preview;
  const renderOption = (item) => (
    <CategoryOption key={item} item={item} count={counts.get(item) ?? 0} selected={value === item} onChange={onChange} />
  );

  return (
    <div className="catalog-categories" role="group" aria-label={t("Категории товаров")}>
      <div className="catalog-categories__options">
        {shownInPreview.map(renderOption)}
        {extra.length > 0 && (
          <button
            type="button"
            className="catalog-categories__toggle"
            aria-controls={extraId}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {t(expanded ? "Свернуть категории" : "Больше категорий")}
            <ChevronDown size={17} aria-hidden="true" />
          </button>
        )}
      </div>
      <div id={extraId} className="catalog-categories__options" hidden={!expanded}>
        {expanded && extra.map(renderOption)}
      </div>
    </div>
  );
}

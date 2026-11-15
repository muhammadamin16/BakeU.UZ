import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ProductPhoto from "./ProductPhoto";
import { money } from "../utils/format";

export default function OrderItemsField({
  id,
  products,
  shopId,
  value = [],
  onChange,
  disabled,
}) {
  const [selected, setSelected] = useState("");
  const available = products.filter(
    (row) => row.shopId === shopId && row.status === "Опубликован",
  );
  return (
    <div className="ad-order-items-field">
      {!disabled && (
        <div className="ad-order-add-item">
          <select
            id={id}
            aria-label="Товар для заказа"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={!shopId}
          >
            <option value="">
              {shopId ? "Выберите товар" : "Сначала выберите магазин"}
            </option>
            {available.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {money(row.price)}
              </option>
            ))}
          </select>
          <button
            className="ad-btn"
            type="button"
            disabled={!available.some((row) => row.id === selected)}
            onClick={() => {
              const product = available.find((row) => row.id === selected);
              if (!product) return;
              const existing = value.find(
                (row) => row.productId === product.id,
              );
              onChange(
                existing
                  ? value.map((row) =>
                      row.productId === product.id
                        ? { ...row, quantity: row.quantity + 1 }
                        : row,
                    )
                  : [
                      ...value,
                      {
                        productId: product.id,
                        name: product.name,
                        image: product.image,
                        unitPrice: Number(product.price),
                        quantity: 1,
                        shopId: product.shopId,
                      },
                    ],
              );
            }}
          >
            <Plus size={16} />В заказ
          </button>
        </div>
      )}
      {value.map((line) => (
        <div className="ad-order-line-editor" key={line.productId}>
          <ProductPhoto src={line.image} alt={line.name} />
          <div>
            <strong>{line.name}</strong>
            <small>{money(line.unitPrice)} за шт.</small>
          </div>
          <input
            type="number"
            min="1"
            max="9999"
            step="1"
            aria-label={`Количество: ${line.name}`}
            value={line.quantity}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                value.map((row) =>
                  row.productId === line.productId
                    ? {
                        ...row,
                        quantity:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      }
                    : row,
                ),
              )
            }
          />
          {!disabled && (
            <button
              type="button"
              className="ad-icon danger"
              aria-label={`Убрать ${line.name}`}
              onClick={() =>
                onChange(
                  value.filter((row) => row.productId !== line.productId),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      {!value.length && <p className="ad-muted">Состав заказа не указан.</p>}
    </div>
  );
}

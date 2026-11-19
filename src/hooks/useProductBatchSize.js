import { useSyncExternalStore } from "react";

// Keep these breakpoints aligned with .product-grid in ProductCard.css.
const twoColumns = "(max-width: 1050px)";
const threeColumns = "(max-width: 1200px)";

function subscribe(onChange) {
  const queries = [twoColumns, threeColumns].map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

function getBatchSize() {
  if (window.matchMedia(twoColumns).matches) return 4;
  if (window.matchMedia(threeColumns).matches) return 6;
  return 10;
}

export function useProductBatchSize() {
  return useSyncExternalStore(subscribe, getBatchSize, () => 10);
}

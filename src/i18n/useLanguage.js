import { useSyncExternalStore } from "react";
import { getLanguage, subscribeLanguage } from "./index.js";
export function useLanguage() {
  return useSyncExternalStore(subscribeLanguage, getLanguage, () => "ru");
}

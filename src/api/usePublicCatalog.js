import { useEffect, useState } from "react";
import { goAPIBase, goPhoneAccountsEnabled, productImageURL, serverStorefrontEnabled } from "./goAccount.js";
import { loadGoCatalog, projectGoCatalog } from "./goCatalog.js";
import { useCatalog } from "../store/sellerData.js";

export const publicGoCatalogEnabled = goPhoneAccountsEnabled || serverStorefrontEnabled;
const emptyCatalog = { shops: [], products: [] };

export function usePublicCatalog() {
  const local = useCatalog();
  const [remote, setRemote] = useState(() => ({
    ...emptyCatalog,
    loading: Boolean(goAPIBase),
    catalogError: goAPIBase ? "" : "Серверный каталог не настроен.",
  }));
  useEffect(() => {
    if (!publicGoCatalogEnabled || !goAPIBase) return;
    const controller = new AbortController();
    loadGoCatalog(goAPIBase, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) {
        setRemote({ ...projectGoCatalog(result, productImageURL), loading: false, catalogError: "" });
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setRemote({ ...emptyCatalog, loading: false, catalogError: "Не удалось загрузить каталог." });
      }
    });
    return () => controller.abort();
  }, []);
  return publicGoCatalogEnabled ? remote : { ...local, loading: false, catalogError: "" };
}

import { useEffect, useState } from "react";
import { apiBaseURL, phoneAccountsEnabled, productImageURL, serverAccountsEnabled } from "./account.js";
import { loadCatalog, projectCatalog } from "./catalog.js";
import { useCatalog } from "../store/sellerData.js";

export const serverCatalogEnabled = phoneAccountsEnabled || serverAccountsEnabled;
const emptyCatalog = { shops: [], products: [] };

export function usePublicCatalog() {
  const local = useCatalog();
  const [remote, setRemote] = useState(() => ({
    ...emptyCatalog,
    loading: Boolean(apiBaseURL),
    catalogError: apiBaseURL ? "" : "Серверный каталог не настроен.",
  }));
  useEffect(() => {
    if (!serverCatalogEnabled || !apiBaseURL) return;
    const controller = new AbortController();
    loadCatalog(apiBaseURL, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) {
        setRemote({ ...projectCatalog(result, productImageURL), loading: false, catalogError: "" });
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setRemote({ ...emptyCatalog, loading: false, catalogError: "Не удалось загрузить каталог." });
      }
    });
    return () => controller.abort();
  }, []);
  return serverCatalogEnabled ? remote : { ...local, loading: false, catalogError: "" };
}

import { useEffect, useState } from "react";
import { translateText as t } from "../i18n/index.js";

export default function SellerSummary({ transport }) {
  const [state, setState] = useState({ data: null, error: "" }), [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    transport.request("/seller/dashboard", { signal: controller.signal }).then((data) => {
      if (![data?.revenue?.total, data?.activeOrders?.total, data?.products?.count].every(Number.isFinite)) throw Error(t("Сервер вернул неверные показатели."));
      if (!controller.signal.aborted) setState({ data, error: "" });
    }).catch((error) => { if (!controller.signal.aborted) setState({ data: null, error: error.message }); });
    return () => controller.abort();
  }, [transport, revision]);
  return <section className="tg-orders-panel"><h2>{t("Показатели магазина")}</h2>
    {state.error && <p role="alert">{state.error}</p>}
    {state.data && <dl><dt>{t("Выручка за неделю")}</dt><dd>{state.data.revenue.total.toLocaleString("ru-RU")} {t("сум")}</dd><dt>{t("Активные заказы")}</dt><dd>{state.data.activeOrders.total}</dd><dt>{t("Товары")}</dt><dd>{state.data.products.count}</dd></dl>}
    {!state.data && !state.error && <p role="status">{t("Загрузка…")}</p>}
    <button type="button" onClick={() => refresh((value) => value + 1)}>{t("Обновить показатели")}</button>
  </section>;
}

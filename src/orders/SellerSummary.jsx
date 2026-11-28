import { useEffect, useState } from "react";
import { translateText as t } from "../i18n/index.js";

export default function SellerSummary({ transport }) {
  const [period, setPeriod] = useState("week");
  const [state, setState] = useState({ data: null, error: "" }), [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    transport.request("/seller/dashboard?period=" + period, { signal: controller.signal }).then((data) => {
      if (![data?.revenue?.total, data?.activeOrders?.total, data?.products?.count].every(Number.isFinite)) throw Error(t("Сервер вернул неверные показатели."));
      if (!controller.signal.aborted) setState({ data, error: "" });
    }).catch((error) => { if (!controller.signal.aborted) setState({ data: null, error: error.message }); });
    return () => controller.abort();
  }, [transport, revision, period]);
  return <section className="tg-orders-panel"><h2>{t("Показатели магазина")}</h2>
    <label>{t("Период")} <select value={period} onChange={event => setPeriod(event.target.value)}>
      <option value="day">{t("День")}</option><option value="week">{t("Неделя")}</option><option value="month">{t("Месяц")}</option>
    </select></label>
    {state.error && <p role="alert">{state.error}</p>}
    {state.data && <dl><dt>{t("Выручка")}</dt><dd>{state.data.revenue.total.toLocaleString("ru-RU")} {t("сум")}</dd><dt>{t("Активные заказы")}</dt><dd>{state.data.activeOrders.total}</dd><dt>{t("Товары")}</dt><dd>{state.data.products.count}</dd></dl>}
    {state.data?.topProducts?.length > 0 && <ul>{state.data.topProducts.map(item => <li key={item.id}>
      {item.title} · {item.quantity} · {item.revenue.toLocaleString("ru-RU")} {t("сум")}
    </li>)}</ul>}
    {!state.data && !state.error && <p role="status">{t("Загрузка…")}</p>}
    <button type="button" onClick={() => refresh((value) => value + 1)}>{t("Обновить показатели")}</button>
  </section>;
}

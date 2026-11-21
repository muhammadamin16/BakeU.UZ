import { lazy, Suspense, useState } from "react";
import { translateText as t } from "../i18n/index.js";
const ShopLocationPicker = lazy(() => import("../components/ShopLocationPicker/ShopLocationPicker.jsx"));

export default function OpenOwnShop({ account, transport, onOpened }) {
  const [firstName, ...surname] = (account.name || "").trim().split(/\s+/);
  const [form, setForm] = useState({ firstName, lastName: surname.join(" "), name: account.market?.name || "", description: account.market?.description || "", address: account.market?.address || "", lat: account.market?.lat ?? null, lng: account.market?.lng ?? null });
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const change = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  async function open(event) {
    event.preventDefault(); if (busy) return;
    if (form.lat == null || form.lng == null) return setNotice(t("Выберите точку магазина на карте."));
    setBusy(true); setNotice(""); let committed = false;
    try {
      const market = await transport.request("/market/self-service", { method: "POST", body: form });
      if (market.sellerId !== account.uid || market.status !== "approved") throw Error(t("Магазин не подтверждён сервером."));
      committed = true;
      await onOpened();
    } catch (error) { setNotice(committed ? t("Магазин открыт. Обновите страницу, чтобы загрузить кабинет.") : error.message || t("Не удалось открыть магазин.")); }
    finally { setBusy(false); }
  }
  return <details className="tg-orders-panel"><summary>{t("Открыть свой магазин")}</summary>
    <p>{t("Подтверждённый номер")}: <strong>{account.verifiedPhoneE164}</strong></p>
    <p>{t("Магазин откроется после сохранения. Покупки и история останутся в этом аккаунте.")}</p>
    <form onSubmit={open}><fieldset disabled={busy}>
      <label>{t("Имя")}<input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={change("firstName")} /></label>
      <label>{t("Фамилия")}<input required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={change("lastName")} /></label>
      <label>{t("Название магазина")}<input required minLength={2} maxLength={150} value={form.name} onChange={change("name")} /></label>
      <label>{t("Описание магазина")}<textarea maxLength={2000} value={form.description} onChange={change("description")} /></label>
      <Suspense fallback={<p>{t("Загрузка карты…")}</p>}><ShopLocationPicker value={form} onChange={setForm} id="go-shop-location" /></Suspense>
      <button>{t(busy ? "Сохраняем…" : "Открыть магазин")}</button>
    </fieldset></form>
    {notice && <p role="status">{notice}</p>}
  </details>;
}

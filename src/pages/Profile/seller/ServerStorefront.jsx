import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { accountAPI as api, phoneAccountsEnabled } from "../../../api/account.js";
import { Link } from "react-router-dom";
import { translateText } from "../../../i18n/index.js";
import { createWebsiteOrdersClient } from "../../../orders/client.js";
import ServerOrdersPanel from "../../../orders/ServerOrdersPanel.jsx";
import ServerProducts from "./ServerProducts.jsx";

const ShopLocationPicker = lazy(() => import("../../../components/ShopLocationPicker/ShopLocationPicker.jsx"));

const fields = [
  ["name", "Название магазина"], ["description", "Описание магазина"],
  ["city", "Город"], ["area", "Район"], ["address", "Адрес"],
  ["lat", "Широта", "number"], ["lng", "Долгота", "number"],
];

async function loadShop(api) {
  try {
    return await api.request("/market/mine");
  } catch (error) {
    if (error.status !== 404) throw error;
    const user = await api.request("/me");
    if (user.role !== "seller") throw Error("Войдите с данными аккаунта продавца.", { cause: error });
    return { status: "draft", sellerId: user.uid, phone: user.phone, email: user.email, fulfillment: "both" };
  }
}

export default function ServerStorefront({ accountApi = api, embedded = false }) {
  const api = accountApi;
  const [shop, setShop] = useState(null);
  const [draft, setDraft] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const [logo, setLogo] = useState(null);
  const sellerId = shop?.sellerId;
  const ordersClient = useMemo(() => sellerId && !embedded ? createWebsiteOrdersClient(async (path, options) => {
    const result = await api.requestWithOptions(path, options);
    if (path === "/me" && (result.uid !== sellerId || result.role !== "seller")) {
      throw Error("Сессия продавца изменилась. Откройте настройки магазина снова.");
    }
    return result;
  }) : null, [sellerId, api, embedded]);
  useEffect(() => {
    let active = true;
    loadShop(api).then((data) => {
      if (active) { setShop(data); setDraft(data); }
    }).catch((error) => {
      if (active) {
        if (error.status === 401) setNeedsLogin(true);
        else setNotice(error.message);
      }
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [api]);

  async function run(action) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      if (error.status === 401) setNeedsLogin(true);
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    form.reset();
    return run(async () => {
      await api.login(values.get("email"), values.get("password"));
      setNeedsLogin(false);
      const data = await loadShop(api);
      setShop(data);
      setDraft(data);
    });
  }

  function save(event) {
    event.preventDefault();
    return run(async () => {
      const payload = Object.fromEntries(fields.slice(0, 5).map(([key]) => [key, draft[key] ?? ""]));
      payload.fulfillment = draft.fulfillment;
      if (phoneAccountsEnabled) payload.pointConfirmed = draft.pointConfirmed === true;
      const hasLat = draft.lat != null && draft.lat !== "";
      const hasLng = draft.lng != null && draft.lng !== "";
      if (hasLat !== hasLng) throw Error("Укажите обе координаты.");
      if (hasLat) {
        payload.lat = Number(draft.lat);
        payload.lng = Number(draft.lng);
      } else if (shop.lat != null || shop.lng != null) {
        payload.clearPoint = true;
      }
      let data;
      if (shop.status === "approved") {
        data = await api.request("/market/mine", "PATCH", payload);
      } else {
        if (!logo || logo.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(logo.type)) throw Error("Выберите логотип JPEG, PNG или WebP до 5 МБ.");
        const body = new FormData();
        for (const key of ["name", "description", "city", "area", "address", "fulfillment", "lat", "lng"]) {
          if (payload[key] != null) body.append(key, String(payload[key]));
        }
        body.append("phone", draft.phone || "");
        body.append("email", draft.email || "");
        body.append("logo", logo);
        data = await api.request("/market", "POST", body);
      }
      setShop(data);
      setDraft(data);
      setNotice(data.status === "pending" ? "Заявка отправлена на проверку. Магазин появится после одобрения." : "Настройки сохранены.");
    });
  }

  return (
    <section className="bw-card" aria-busy={busy}>
      <h2>{translateText("Настройки магазина")}</h2>
      {notice && <p role="status">{translateText(notice)}</p>}
      {needsLogin && phoneAccountsEnabled ? <Link to="/login">{translateText("Войти")}</Link> : needsLogin ? (
        <form onSubmit={login} className="bw-fields">
          <label className="bw-field">Email<input name="email" type="email" autoComplete="username" required /></label>
          <label className="bw-field">{translateText("Пароль")}<input name="password" type="password" autoComplete="current-password" required /></label>
          <button disabled={busy} className="bw-btn primary">{translateText("Войти")}</button>
        </form>
      ) : draft ? (
        <>
          <p>Статус магазина: {{ draft: "Черновик", pending: "На проверке", rejected: "Отклонён", approved: "Одобрен", suspended: "Приостановлен" }[shop.status] || shop.status}</p>
          {shop.rejectionReason && <p role="status">{shop.rejectionReason}</p>}
          <form onSubmit={save}>
            <fieldset disabled={busy || shop.status === "suspended" || (phoneAccountsEnabled && shop.status !== "approved")} className="bw-fields">
              {fields.filter(([key]) => !phoneAccountsEnabled || !["address", "lat", "lng"].includes(key)).map(([key, label, type = "text"]) => (
                <label className="bw-field" key={key}>{translateText(label)}
                  <input type={type} required={phoneAccountsEnabled ? key === "name" : ["name", "description", "city"].includes(key)} step={type === "number" ? "any" : undefined}
                    value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                </label>
              ))}
              {phoneAccountsEnabled && <Suspense fallback={<p role="status">{translateText("Загрузка карты…")}</p>}>
                <ShopLocationPicker id="seller-shop-point" value={draft} onChange={updated => setDraft({
                  ...updated, pointConfirmed: updated.address === draft.address && Number.isFinite(updated.lat) && Number.isFinite(updated.lng),
                })} />
              </Suspense>}
              {!phoneAccountsEnabled && <button type="button" className="bw-btn" onClick={() => {
                if (!navigator.geolocation) { setNotice("Геолокация недоступна в этом браузере."); return; }
                navigator.geolocation.getCurrentPosition(({ coords }) => {
                  setDraft((current) => ({ ...current, lat: coords.latitude, lng: coords.longitude }));
                  setNotice("Точка магазина выбрана. Проверьте адрес и сохраните.");
                }, () => setNotice("Не удалось определить точку. Введите координаты вручную."), { timeout: 10000 });
              }}>Указать местоположение магазина</button>}
              {!phoneAccountsEnabled && shop.status !== "approved" && <>
                <label className="bw-field">Контактный телефон<input type="tel" required value={draft.phone || ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
                <label className="bw-field">Email магазина<input type="email" required value={draft.email || ""} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
                <label className="bw-field">Логотип магазина (до 5 МБ)<input type="file" required accept="image/jpeg,image/png,image/webp" onChange={(event) => setLogo(event.target.files?.[0] || null)} /></label>
              </>}
              <label className="bw-field">{translateText("Способ получения")}
                <select value={draft.fulfillment} onChange={(event) => setDraft({ ...draft, fulfillment: event.target.value })}>
                  <option value="pickup">{translateText("Самовывоз")}</option>
                  <option value="delivery">{translateText("Доставка")}</option>
                  <option value="both">{translateText("Самовывоз и доставка")}</option>
                </select>
              </label>
              <button className="bw-btn primary">{shop.status === "approved" ? translateText("Сохранить изменения") : "Отправить заявку на открытие магазина"}</button>
            </fieldset>
          </form>
          {shop.status === "suspended" ? <p>Магазин приостановлен. Обратитесь в поддержку.</p> : shop.status !== "approved" && <p>Заполните описание, город и добавьте логотип. Товары станут доступны после одобрения магазина.</p>}
          {shop.status === "approved" && <ServerProducts key={sellerId} sellerId={sellerId} accountApi={api} />}
          {ordersClient && (
            <>
              <h3>{translateText("Заказы")}</h3>
              <ServerOrdersPanel client={ordersClient} sessionKey={sellerId} />
            </>
          )}
        </>
      ) : null}
      {!embedded && !needsLogin && !busy && (
        <button className="bw-btn" type="button" onClick={() => run(async () => {
          await api.logout();
          setShop(null);
          setDraft(null);
          setNeedsLogin(true);
        })}>{translateText("Выйти из серверного аккаунта")}</button>
      )}
    </section>
  );
}

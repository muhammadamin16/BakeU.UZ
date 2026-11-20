import { useEffect, useState } from "react";
import { goAccount as api } from "../../../api/goAccount.js";
import { translateText } from "../../../i18n/index.js";
import ServerProducts from "./ServerProducts.jsx";

const fields = [
  ["name", "Название магазина"], ["description", "Описание магазина"],
  ["city", "Город"], ["area", "Район"], ["address", "Адрес"],
  ["lat", "Широта", "number"], ["lng", "Долгота", "number"],
];

async function loadShop() {
  return api.request("/market/mine");
}

export default function ServerStorefront() {
  const [shop, setShop] = useState(null);
  const [draft, setDraft] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    loadShop().then((data) => {
      if (active) { setShop(data); setDraft(data); }
    }).catch((error) => {
      if (active) {
        if (error.status === 401) setNeedsLogin(true);
        else setNotice(error.message);
      }
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

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
      const data = await loadShop();
      setShop(data);
      setDraft(data);
    });
  }

  function save(event) {
    event.preventDefault();
    return run(async () => {
      const payload = Object.fromEntries(fields.slice(0, 5).map(([key]) => [key, draft[key] ?? ""]));
      payload.fulfillment = draft.fulfillment;
      const hasLat = draft.lat != null && draft.lat !== "";
      const hasLng = draft.lng != null && draft.lng !== "";
      if (hasLat !== hasLng) throw Error("Укажите обе координаты.");
      if (hasLat) {
        payload.lat = Number(draft.lat);
        payload.lng = Number(draft.lng);
      } else if (shop.lat != null || shop.lng != null) {
        payload.clearPoint = true;
      }
      const data = await api.request("/market/mine", "PATCH", payload);
      setShop(data);
      setDraft(data);
      setNotice("Настройки сохранены.");
    });
  }

  return (
    <section className="bw-card" aria-busy={busy}>
      <h2>{translateText("Настройки магазина")}</h2>
      {notice && <p role="status">{translateText(notice)}</p>}
      {needsLogin ? (
        <form onSubmit={login} className="bw-fields">
          <label className="bw-field">Email<input name="email" type="email" autoComplete="username" required /></label>
          <label className="bw-field">{translateText("Пароль")}<input name="password" type="password" autoComplete="current-password" required /></label>
          <button disabled={busy} className="bw-btn primary">{translateText("Войти")}</button>
        </form>
      ) : draft ? (
        <>
          <form onSubmit={save}>
            <fieldset disabled={busy || shop.status !== "approved"} className="bw-fields">
              {fields.map(([key, label, type = "text"]) => (
                <label className="bw-field" key={key}>{translateText(label)}
                  <input type={type} step={type === "number" ? "any" : undefined}
                    value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                </label>
              ))}
              <label className="bw-field">{translateText("Способ получения")}
                <select value={draft.fulfillment} onChange={(event) => setDraft({ ...draft, fulfillment: event.target.value })}>
                  <option value="pickup">{translateText("Самовывоз")}</option>
                  <option value="delivery">{translateText("Доставка")}</option>
                  <option value="both">{translateText("Самовывоз и доставка")}</option>
                </select>
              </label>
              <button className="bw-btn primary">{translateText("Сохранить изменения")}</button>
            </fieldset>
          </form>
          {shop.status !== "approved" && <p>{translateText("Редактирование доступно после одобрения магазина.")}</p>}
          {shop.status === "approved" && <ServerProducts key={shop.sellerId} sellerId={shop.sellerId} />}
        </>
      ) : null}
      {!needsLogin && !busy && (
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

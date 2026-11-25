import { useState } from "react";
import { Link } from "react-router-dom";
import { translateText as t } from "../i18n/index.js";

export default function GoEmailAccount({ transport, intent, register, orderParams, onSuccess, cancelTo }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const role = intent === "shop" ? "seller" : intent === "buyer" ? "customer" : undefined;

  const orderSuffix = orderParams.size ? "&" + orderParams : "";

  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = fields.get("email");
    const password = fields.get("password");
    setError("");
    setBusy(true);
    try {
      const user = register
        ? await transport.signup({ email, password, role, name: fields.get("name"), phone: fields.get("phone") })
        : await transport.login(email, password, role);
      const account = await transport.request("/me", { headers: { "X-BakeU-Account": user.uid } });
      onSuccess(account);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bw-card tg-account-switch">
      <h2>{t(register
        ? role === "seller" ? "Создать аккаунт продавца" : "Создать аккаунт покупателя"
        : role === "seller" ? "Войти в магазин" : role === "customer" ? "Войти как покупатель" : "Войти в BakeU")}</h2>
      {role === "customer" && <p>{t("Для оформления заказа войдите в аккаунт покупателя. Ваш магазин и его заказы сохранятся.")}</p>}
      <form onSubmit={submit}>
        {register && <label>{t("Имя")}<input name="name" autoComplete="name" minLength={2} maxLength={100} required /></label>}
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        {register && <label>{t("Телефон")}<input name="phone" type="tel" autoComplete="tel" placeholder="+998901234567" required /></label>}
        <label>{t("Пароль")}<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"}
          minLength={register ? 8 : 1} maxLength={72} required /></label>
        {error && <p role="alert">{t(error)}</p>}
        <button disabled={busy}>{t(register ? "Создать аккаунт" : "Войти")}</button>
      </form>
      <div className="tg-orders-account-actions">
        <Link to={(register ? `?auth=${intent}` : `?auth=${role === "seller" ? "shop" : "buyer"}&register=1`) + orderSuffix}>
          {t(register ? "Уже есть аккаунт" : role === "seller" ? "Создать аккаунт продавца" : "Создать аккаунт покупателя")}
        </Link>
        <Link to={cancelTo}>{t("Назад")}</Link>
      </div>
    </section>
  );
}

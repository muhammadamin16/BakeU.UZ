import { translateText } from "../../../i18n/index.js";
import { useState } from "react";
import { useAdminStore } from "../../store/adminStore";
import { PageTitle } from "../../components/AdminUI";
import "./Settings.css";
export default function Settings() {
  const settings = useAdminStore((s) => s.settings);
  const save = useAdminStore((s) => s.saveSettings);
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <PageTitle title={translateText("Настройки")} />
      <section className="ad-panel ad-settings">
        <h2>{translateText("Профиль администратора")}</h2>
        <form
          className="ad-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              save(form);
              setSaved(true);
              setError("");
            } catch (failure) {
              setError(failure.message);
              setSaved(false);
            }
          }}
        >
          {[
            ["name", "Имя", "text"],
            ["email", "Email", "email"],
            ["site", "Название сайта", "text"],
          ].map(([key, label, type]) => (
            <label key={key}>
              {translateText(label)}
              <input
                required
                type={type}
                value={form[key]}
                onChange={(e) => {
                  setForm({ ...form, [key]: e.target.value });
                  setSaved(false);
                }}
              />
            </label>
          ))}
          <label className="ad-check">
            <input
              type="checkbox"
              checked={form.notifications}
              onChange={(e) => {
                setForm({ ...form, notifications: e.target.checked });
                setSaved(false);
              }}
            />
            {translateText("Показывать уведомления на обзоре")}
          </label>
          <button className="ad-btn primary">
            {translateText("Сохранить изменения")}
          </button>
          {error && (
            <p role="alert" className="ad-form-error">
              {translateText(error)}
            </p>
          )}
          {saved && (
            <p role="status" className="ad-success">
              {translateText("Настройки сохранены")}
            </p>
          )}
        </form>
      </section>
      <p className="ad-muted">
        {translateText(
          "Демо-режим: настройки действуют в этом браузере. Серверная авторизация администратора ещё не подключена.",
        )}
      </p>
    </>
  );
}

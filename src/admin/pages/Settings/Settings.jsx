import { useState } from "react";
import { useAdminStore } from "../../store/adminStore";
import { PageTitle } from "../../components/AdminUI";
import "./Settings.css";
export default function Settings() {
  const settings = useAdminStore((s) => s.settings);
  const save = useAdminStore((s) => s.saveSettings);
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageTitle title="Настройки" />
      <section className="ad-panel ad-settings">
        <h2>Профиль администратора</h2>
        <form
          className="ad-form"
          onSubmit={(e) => {
            e.preventDefault();
            save(form);
            setSaved(true);
          }}
        >
          {[
            ["name", "Имя", "text"],
            ["email", "Email", "email"],
            ["site", "Название сайта", "text"],
          ].map(([key, label, type]) => (
            <label key={key}>
              {label}
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
            Показывать уведомления на обзоре
          </label>
          <button className="ad-btn primary">Сохранить изменения</button>
          {saved && (
            <p role="status" className="ad-success">
              Настройки сохранены
            </p>
          )}
        </form>
      </section>
      <p className="ad-muted">
        Демо-режим: настройки действуют в этом браузере. Серверная авторизация
        администратора ещё не подключена.
      </p>
    </>
  );
}

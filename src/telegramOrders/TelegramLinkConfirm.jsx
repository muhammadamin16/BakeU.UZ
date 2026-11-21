import { useState } from "react";
import "./orders.css";
export default function TelegramLinkConfirm({ client, challengeId }) {
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  return (
    <section className="tg-orders-panel">
      <h2>🔐 Привязка Telegram к BakeU</h2>
      <p>
        Войдите в существующий аккаунт BakeU. Подтверждение не создаёт новый
        аккаунт и не объединяет пользователей по совпадению телефона.
      </p>
      {done ? (
        <p role="status">
          Привязка подтверждена сервером. Вернитесь в бот и нажмите «Мои заказы»
          или «Я продавец».
        </p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              if (!client) throw new Error("Общий Backend пока не подключён.");
              await client.confirmLink(challengeId, password);
              setPassword("");
              setDone(true);
            } catch (failure) {
              setError(failure.message || "Привязка не выполнена.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Подтвердите пароль аккаунта
            <input
              type="password"
              autoComplete="current-password"
              maxLength={256}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy || !client}>
            {busy ? "Подтверждаем…" : "Привязать Telegram"}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

import { Link } from "react-router-dom";
import { ShieldCheck, LoaderCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useAdminAccess } from "../useAdminAccess";
export default function AdminGate({ children, allowDemoPreview = false }) {
  const { status, verifiedAdmin, demoPreview, canPreviewDemo, retry, error } =
    useAdminAccess();
  if (verifiedAdmin || (allowDemoPreview && demoPreview)) return children;
  const loading = status === "loading";
  const denied = status === "ready";
  return (
    <main className="mini-gate">
      <img src="/images/logo-bear.png" alt="BakeU" width="240" height="80" />
      <div className="mini-gate-icon">
        {loading ? (
          <LoaderCircle className="mini-spin" size={31} />
        ) : (
          <ShieldCheck size={31} />
        )}
      </div>
      <h1>
        {loading
          ? "Проверяем вход…"
          : denied
            ? "Нет прав администратора"
            : "Вход для администратора"}
      </h1>
      <p>
        {loading
          ? "Проверяем вашу Telegram-сессию на сервере."
          : error ||
            (denied
              ? "Ваш Telegram-аккаунт подтверждён, но у него нет прав администратора. Обратитесь к владельцу BakeU."
              : "Для доступа к серверным данным откройте Mini App кнопкой в Telegram-боте с аккаунта администратора. Обычная ссылка в браузере не создаёт Telegram-сессию.")}
      </p>
      {canPreviewDemo && !loading && (
        <Link className="mini-secondary" to="/admin">
          Открыть демо-админку
        </Link>
      )}
      {!loading && (status === "error" || denied) && (
        <button className="mini-secondary" onClick={retry}>
          <RefreshCw size={16} /> Проверить снова
        </button>
      )}
      <Link to="/miniapp">
        <ArrowLeft size={16} /> На главную Mini App
      </Link>
    </main>
  );
}

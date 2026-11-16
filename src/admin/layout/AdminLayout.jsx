import { useEffect, useLayoutEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import "../styles/admin.css";
import "./AdminLayout.css";
import "./AdminGlass.css";
import "./AdminManagement.css";
import { useAdminStore } from "../store/adminStore";
import { useAdminAccess } from "../../miniapp/useAdminAccess";
export default function AdminLayout() {
  const { localPreview } = useAdminAccess();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const { pathname } = useLocation();
  const refresh = useAdminStore((state) => state.refreshSubscriptions);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  useEffect(() => {
    const update = () => {
      try {
        refresh();
      } catch (failure) {
        setError(failure.message);
      }
    };
    update();
    const timer = window.setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    const sync = (event) => {
      if (event.key === "bakeu-admin-demo-v1")
        useAdminStore.persist.rehydrate();
    };
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("storage", sync);
    };
  }, [refresh]);
  return (
    <div className="ad-app">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="ad-main">
        <Header onMenu={() => setOpen(true)} />
        <main className="ad-content">
          {localPreview && (
            <p className="ad-local-preview" role="status">
              <strong>Локальная демо-админка.</strong> Данные сохраняются в этом
              браузере. Серверные аккаунты и заявки требуют входа через
              Telegram.
            </p>
          )}
          {error && (
            <p role="alert" className="ad-form-error">
              {error}
            </p>
          )}
          <Outlet />
        </main>
        <footer className="ad-footer">
          Демо-панель · данные сохраняются в этом браузере
        </footer>
      </div>
    </div>
  );
}

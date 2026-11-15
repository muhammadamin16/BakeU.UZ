import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import "../styles/admin.css";
import "./AdminLayout.css";
import "./AdminGlass.css";
export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="ad-app">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="ad-main">
        <Header onMenu={() => setOpen(true)} />
        <main className="ad-content">
          <Outlet />
        </main>
        <footer className="ad-footer">
          Демо-панель · данные сохраняются в этом браузере
        </footer>
      </div>
    </div>
  );
}

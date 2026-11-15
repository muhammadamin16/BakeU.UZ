import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Users,
  Store,
  ClipboardList,
  Package,
  ShoppingCart,
  CreditCard,
  Bell,
  Settings,
  X,
} from "lucide-react";
import { useAdminStore } from "../../store/adminStore";
import "./Sidebar.css";
const links = [
  ["", "Обзор", BarChart3],
  ["customers", "Покупатели", Users],
  ["shops", "Магазины", Store],
  ["applications", "Заявки", ClipboardList],
  ["products", "Товары", Package],
  ["orders", "Заказы", ShoppingCart],
  ["subscriptions", "Подписки", CreditCard],
  ["notifications", "Уведомления", Bell],
  ["settings", "Настройки", Settings],
];
export default function Sidebar({ open, onClose }) {
  const count = useAdminStore(
    (s) => s.applications.filter((x) => x.status === "На проверке").length,
  );
  return (
    <>
      <button
        className={`ad-shade ${open ? "visible" : ""}`}
        onClick={onClose}
        aria-label="Закрыть меню"
      />
      <aside className={`ad-sidebar ${open ? "open" : ""}`}>
        <div className="ad-brand">
          <span>
            B<span className="ad-brand-bread">♨</span>KEU
          </span>
          <small>
            МАРКЕТПЛЕЙС
            <br />
            ДОМАШНЕЙ ВЫПЕЧКИ
          </small>
        </div>
        <button
          className="ad-mobile-close ad-icon"
          onClick={onClose}
          aria-label="Закрыть меню"
        >
          <X />
        </button>
        <nav>
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={`/admin${path ? "/" + path : ""}`}
              end={!path}
              onClick={onClose}
            >
              <Icon size={21} />
              <span>{label}</span>
              {path === "applications" && count > 0 && <b>{count}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="ad-sidebar-foot">
          BakeU Admin <span>v1.0</span>
        </div>
      </aside>
    </>
  );
}

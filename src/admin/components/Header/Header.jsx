import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Bell, UserRound, ChevronDown, Menu } from "lucide-react";
import { useAdminStore } from "../../store/adminStore";
import "./Header.css";
export default function Header({ onMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const count = useAdminStore(
    (s) => s.notifications.filter((x) => !x.read).length,
  );
  const name = useAdminStore((s) => s.settings.name);
  return (
    <header className="ad-header">
      <button
        className="ad-icon ad-menu"
        onClick={onMenu}
        aria-label="Открыть меню"
      >
        <Menu />
      </button>
      <div className="ad-breadcrumb">
        <Link to="/" aria-label="Главная сайта">
          <Home size={19} />
        </Link>
        <span>›</span>
        <Link to="/admin">Админ-панель</Link>
      </div>
      <form
        className="ad-search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(
            `${location.pathname}?q=${encodeURIComponent(query.trim())}`,
          );
        }}
      >
        <Search size={17} />
        <input
          aria-label="Поиск по имени или ID"
          placeholder="Найти по имени или ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <Link
        className="ad-notification-bell"
        to="/admin/notifications"
        aria-label={`Уведомления: ${count}`}
      >
        <Bell size={22} />
        {count > 0 && <b>{count}</b>}
      </Link>
      <Link className="ad-account" to="/admin/settings">
        <span className="ad-avatar">
          <UserRound size={18} />
        </span>
        <span>{name}</span>
        <ChevronDown size={15} />
      </Link>
    </header>
  );
}

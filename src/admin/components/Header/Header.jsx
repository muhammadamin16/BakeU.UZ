import LanguageSwitcher from "../../../components/LanguageSwitcher/LanguageSwitcher";
import { translateText } from "../../../i18n/index.js";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Bell, UserRound, ChevronDown, Menu } from "lucide-react";
import { useAdminStore } from "../../store/adminStore";
import "./Header.css";
function HeaderSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState(
    () => new URLSearchParams(location.search).get("q") || "",
  );
  return (
    <form
      className="ad-search"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams(location.search);
        if (query.trim()) params.set("q", query.trim());
        else params.delete("q");
        const collection = location.pathname.match(
          /^\/admin\/(customers|sellers|shops|products|orders|subscriptions|applications|notifications|history)/,
        )?.[1];
        const path = collection ? `/admin/${collection}` : "/admin";
        navigate(`${path}${params.toString() ? "?" + params : ""}`);
      }}
    >
      <Search size={17} />
      <input
        aria-label={translateText("Поиск по имени или ID")}
        placeholder={translateText("Найти по имени или ID")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}

export default function Header({ onMenu }) {
  const location = useLocation();
  const count = useAdminStore(
    (s) => s.notifications.filter((x) => !x.read).length,
  );
  const name = useAdminStore((s) => s.settings.name);
  return (
    <header className="ad-header">
      <button
        className="ad-icon ad-menu"
        onClick={onMenu}
        aria-label={translateText("Открыть меню")}
      >
        <Menu />
      </button>
      <div className="ad-breadcrumb">
        <Link to="/" aria-label={translateText("Главная сайта")}>
          <Home size={19} />
        </Link>
        <span>›</span>
        <Link to="/admin">{translateText("Админ-панель")}</Link>
      </div>
      <HeaderSearch key={location.pathname + location.search} />
      <LanguageSwitcher />
      <Link
        className="ad-notification-bell"
        to="/admin/notifications"
        aria-label={translateText(`Уведомления: ${count}`)}
      >
        <Bell size={22} />
        {count > 0 && <b>{count}</b>}
      </Link>
      <Link className="ad-account" to="/admin/settings" aria-label={translateText("Настройки")}>
        <span className="ad-avatar">
          <UserRound size={18} />
        </span>
        <span>{translateText(name)}</span>
        <ChevronDown size={15} />
      </Link>
    </header>
  );
}

import { Link, NavLink, Outlet } from "react-router-dom";
import { mainNavigation } from "@/config/navigation";
export function AppLayout() {
  return (
    <div className="mobile-app">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        К содержимому
      </a>
      <header className="app-header">
        <Link to="/" className="brand" aria-label="BakeU — главная">
          BakeU
        </Link>
        <span>Мобильное приложение</span>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="main-navigation" aria-label="Основная навигация">
        {mainNavigation.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

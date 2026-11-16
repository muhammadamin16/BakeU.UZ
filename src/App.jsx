import { useLanguage } from "./i18n/useLanguage";
import MiniAppProvider from "./miniapp/MiniAppProvider";
import MiniAppBar from "./miniapp/components/MiniAppBar";
import { useMiniApp } from "./miniapp/context";
import { HashRouter, useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import WinterTheme from "./components/WinterTheme/WinterTheme";
import BackgroundMusic from "./components/BackgroundMusic/BackgroundMusic";

function AppContent() {
  const { pathname } = useLocation();
  const { isMiniMode } = useMiniApp();
  const isWelcome = pathname === "/miniapp";
  const isAuth = pathname === "/login" || pathname === "/register";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  return (
    <>
      {!isAdmin && !isWelcome && <WinterTheme />}
      {!isAdmin && !isWelcome && <MiniAppBar />}
      <AppRoutes />
      {!isAdmin && !isWelcome && !isAuth && !isMiniMode && <BackgroundMusic />}
    </>
  );
}

export default function App() {
  useLanguage();
  return (
    <HashRouter>
      <MiniAppProvider>
        <AppContent />
      </MiniAppProvider>
    </HashRouter>
  );
}

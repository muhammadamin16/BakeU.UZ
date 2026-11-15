import { HashRouter, useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import WinterTheme from "./components/WinterTheme/WinterTheme";
import BackgroundMusic from "./components/BackgroundMusic/BackgroundMusic";

function AppContent() {
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  return (
    <>
      {!isAdmin && <WinterTheme />}
      <AppRoutes />
      {!isAdmin && <BackgroundMusic />}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

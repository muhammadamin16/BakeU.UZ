import { HashRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import WinterTheme from "./components/WinterTheme/WinterTheme";

export default function App() {
  return (
    <HashRouter>
      <WinterTheme />
      <AppRoutes />
    </HashRouter>
  );
}
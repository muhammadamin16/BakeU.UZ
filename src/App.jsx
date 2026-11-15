
import { HashRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import WinterTheme from "./components/WinterTheme/WinterTheme";
import BackgroundMusic from "./components/BackgroundMusic/BackgroundMusic";

export default function App() {
  return (
    <HashRouter>
      <WinterTheme />
      <AppRoutes />
      <BackgroundMusic />
    </HashRouter>
  );
}

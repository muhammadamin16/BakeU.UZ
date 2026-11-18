import { prepareTelegram } from "./miniapp/telegram";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/global.css";
import "./styles/glass-controls.css";

void prepareTelegram().finally(() =>
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);

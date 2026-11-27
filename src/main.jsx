import { prepareTelegram } from "./miniapp/telegram";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { localTestMode } from "./api/localTestMode.js";

import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/global.css";
import "./styles/glass-controls.css";

void prepareTelegram().finally(() =>
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      {localTestMode && <aside aria-label="LOCAL TEST" style={{ background: "#713713", color: "#fff", padding: "0.45rem 1rem", textAlign: "center", fontWeight: 700 }}>LOCAL TEST</aside>}
      <App />
    </StrictMode>,
  ),
);

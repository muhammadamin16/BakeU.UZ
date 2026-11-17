import "./native.css";
import { initializeNative } from "./native.js";

// Bundle the complete website, not placeholder screens or a remote-site iframe.
// Guest browsing remains available if a platform plugin cannot initialize.
const cleanup = await initializeNative().catch(() => {
  document.documentElement.dataset.nativeSetup = "unavailable";
});
await import("../../../src/main.jsx");
if (import.meta.hot) import.meta.hot.dispose(() => cleanup?.());

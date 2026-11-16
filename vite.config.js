import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { devPortPlugin, readDevPort } from "./scripts/dev-port.js";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    fileURLToPath(new URL(".", import.meta.url)),
    "VITE_DEV_",
  );
  return {
    plugins: [react(), devPortPlugin()],
    optimizeDeps: { entries: ["index.html"] },
    server: {
      host: "127.0.0.1",
      port: readDevPort(env.VITE_DEV_PORT),
      strictPort: false,
      proxy: { "/api": "http://127.0.0.1:3001" },
    },
  };
});

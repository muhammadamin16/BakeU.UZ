import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { devPortPlugin, readDevPort } from "./scripts/dev-port.js";

// Optional development proxy; no Backend process is started by this project.
function proxyTarget(value, label) {
  if (!value) return undefined;
  const url = new URL(value);
  const privateHost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.hostname.endsWith(".railway.internal");
  if (url.username || url.password || url.search || url.hash || !["/", "/api", "/api/"].includes(url.pathname) ||
      !(url.protocol === "https:" || url.protocol === "http:" && privateHost)) {
    throw Error(`${label} must be an HTTPS or private/loopback API origin without credentials.`);
  }
  return url.origin;
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "VITE_"), ...process.env };
  const backend = proxyTarget(env.VITE_BACKEND_PROXY_TARGET, "VITE_BACKEND_PROXY_TARGET");
  const bot = proxyTarget(env.VITE_MINIAPP_PROXY_TARGET, "VITE_MINIAPP_PROXY_TARGET") || backend;
  const proxy = target => ({
    target, changeOrigin: true, ws: true,
  });
  return {
    plugins: [react(), devPortPlugin(), {
      name: "bakeu-public-api-only",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const path = new URL(req.url, "http://localhost").pathname;
          if (path === "/api/integrations" || path.startsWith("/api/integrations/")) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Service routes are not public frontend routes." }));
            return;
          }
          const botPath = path === "/api/miniapp" || path.startsWith("/api/miniapp/") || path === "/api/telegram/config";
          if ((path === "/api" || path.startsWith("/api/")) && !(botPath ? bot : backend)) {
            res.writeHead(503, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
            res.end(JSON.stringify({ error: "Backend ҳали уланмаган. Ҳозир frontend интерфейси очиқ." }));
            return;
          }
          next();
        });
      },
    }],
    server: {
      host: "localhost", port: readDevPort(env.VITE_DEV_PORT), strictPort: false,
      proxy: {
        ...(bot && { "/api/miniapp": proxy(bot), "/api/telegram/config": proxy(bot) }),
        ...(backend && { "/api": proxy(backend) }),
      },
    },
    preview: { host: "localhost" },
  };
});

import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { devPortPlugin, readDevPort } from "./scripts/dev-port.js";
import { publicBuildMetadata } from "./scripts/build-metadata.mjs";
import { upstream } from "./scripts/serve.mjs";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "VITE_"), ...process.env };
  const backend = upstream(env.VITE_BACKEND_PROXY_TARGET || "http://127.0.0.1:38119", "VITE_BACKEND_PROXY_TARGET");
  const bot = env.VITE_MINIAPP_PROXY_TARGET ? upstream(env.VITE_MINIAPP_PROXY_TARGET, "VITE_MINIAPP_PROXY_TARGET") : backend;
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
          next();
        });
      },
    }, {
      name: "bakeu-public-build-metadata",
      generateBundle() { this.emitFile({ type: "asset", fileName: "bakeu-build.json", source: JSON.stringify(publicBuildMetadata(env)) }); },
    }],
    server: {
      host: "localhost", port: readDevPort(env.VITE_DEV_PORT), strictPort: false,
      proxy: {
        "/api/miniapp": proxy(bot), "/api/telegram/config": proxy(bot),
        "/api": proxy(backend),
      },
    },
    preview: { host: "localhost" },
  };
});

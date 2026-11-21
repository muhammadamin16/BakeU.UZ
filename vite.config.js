
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { devPortPlugin, readDevPort } from "./scripts/dev-port.js";
import { publicBuildMetadata } from "./scripts/build-metadata.mjs";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    fileURLToPath(new URL(".", import.meta.url)),
    "VITE_"
  );

  return {
    plugins: [react(), devPortPlugin(), {
      name: "bakeu-public-build-metadata",
      generateBundle() { this.emitFile({ type: "asset", fileName: "bakeu-build.json", source: JSON.stringify(publicBuildMetadata(env)) }); },
    }],

    optimizeDeps: {
      entries: ["index.html"],
    },

    server: {
      host: "127.0.0.1",
      port: readDevPort(env.VITE_DEV_PORT),
      strictPort: false,
      proxy: {
        "/api": {
          target:
            env.VITE_BOT_API_PROXY_TARGET ||
            "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
    },

    preview: {
      host: "0.0.0.0",
      allowedHosts: [
        "bakeu-website-production.up.railway.app",
        "bakeu.uz",
        "www.bakeu.uz",
      ],
    },
  };
});

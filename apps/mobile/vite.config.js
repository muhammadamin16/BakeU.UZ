import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { migrationManifest } from "./scripts/migration-manifest.mjs";

const appRoot = fileURLToPath(new URL("./", import.meta.url));
const website = fileURLToPath(new URL("../../", import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, "VITE_");
  if (env.VITE_ACCOUNT_API_URL) {
    let api;
    try {
      api = new URL(env.VITE_ACCOUNT_API_URL);
    } catch {
      throw Error(
        "Mobile VITE_ACCOUNT_API_URL must be an absolute HTTPS API URL, not /api.",
      );
    }
    if (api.protocol !== "https:" || api.username || api.password)
      throw Error("Mobile API must use HTTPS without embedded credentials.");
  }
  return {
    root: appRoot,
    envDir: appRoot,
    base: "./",
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
    plugins: [
      {
        name: "bakeu-shared-html",
        transformIndexHtml: {
          order: "pre",
          handler() {
            return readFileSync(
              new URL("../../index.html", import.meta.url),
              "utf8",
            )
              .replace('src="/src/main.jsx"', 'src="/src/main.js"')
              .replace(
                /<link\b[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[\s\S]*?>/g,
                "",
              );
          },
        },
      },
      react(),
      migrationManifest(website),
    ],
    resolve: { dedupe: ["react", "react-dom", "react-router-dom", "zustand"] },
    server: {
      host: "127.0.0.1",
      port: 4300,
      strictPort: true,
      fs: { allow: [website] },
    },
    preview: { host: "127.0.0.1", port: 4301, strictPort: true },
    build: { target: "es2022" },
  };
});

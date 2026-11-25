import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const website = "https://bakeu-website-production.up.railway.app";
const productionGo = "https://bakeu-backend-production.up.railway.app";
const productionBot = "https://bakeu-bot-production.up.railway.app";
const productionUpstreams = new Set([productionGo, productionBot, "https://bakeuuz-production.up.railway.app"]);

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ogg": "audio/ogg" };
const legacyAuth = new Set(["/api/auth/register", "/api/auth/start-registration", "/api/auth/verify-registration", "/api/auth/start-login", "/api/auth/verify-login", "/api/auth/me"]);

export function upstream(value, label) {
  let url;
  try { url = new URL(value); } catch { throw Error(`${label} must be an API URL.`); }
  const privateHTTP = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.hostname.endsWith(".railway.internal");
  if (url.username || url.password || url.search || url.hash || !["", "/", "/api", "/api/"].includes(url.pathname) ||
      !(url.protocol === "https:" || url.protocol === "http:" && privateHTTP)) throw Error(`${label} must use HTTPS or a private Railway/loopback address, without credentials or query parameters.`);
  return url.origin;
}

export function readWebsiteConfig(env = process.env) {
  const mode = env.WEB_ACCOUNTS_MODE || "legacy";
  if (!["go", "legacy"].includes(mode)) throw Error("WEB_ACCOUNTS_MODE must be go or legacy.");
  const environment = (env.RAILWAY_ENVIRONMENT_NAME || "").trim().toLowerCase();
  const isolated = Boolean(environment && environment !== "production");
  if ((isolated || mode === "go") && (!env.WEB_GO_API_URL?.trim() || !env.WEB_BOT_API_URL?.trim())) {
    throw Error("Set WEB_GO_API_URL and WEB_BOT_API_URL explicitly.");
  }
  const go = upstream(env.WEB_GO_API_URL || productionGo, "WEB_GO_API_URL");
  const bot = upstream(env.WEB_BOT_API_URL || productionBot, "WEB_BOT_API_URL");
  if (isolated && (productionUpstreams.has(go) || productionUpstreams.has(bot))) {
    throw Error("A non-production Railway environment cannot use the known production API URLs.");
  }
  const allowed = (env.WEB_ALLOWED_ORIGINS || env.PUBLIC_SITE_URL || website).split(",").map((v) => v.trim());
  for (const origin of allowed) {
    const url = new URL(origin);
    if (origin !== url.origin || url.username || url.password || !(url.protocol === "https:" || url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))) throw Error("WEB_ALLOWED_ORIGINS must contain exact HTTPS origins.");
  }
  return {
    go, bot,
    mode, allowed, dist: resolve(env.WEB_DIST_DIR || "dist"),
  };
}

export function apiDestination(path, headers, mode) {
  if (path.startsWith("/api/integrations/") || path === "/api/integrations") return null;
  if (path.startsWith("/api/miniapp/") || path === "/api/telegram/config" || path === "/api/shop/open" || legacyAuth.has(path)) return "bot";
  if (["/api/auth/login", "/api/auth/logout"].includes(path)) {
    const explicitGo = ["browser", "refresh"].includes(headers["x-bakeu-session"]) || /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(headers.authorization || "");
    return mode === "go" || explicitGo ? "go" : "bot";
  }
  return /^\/api\/(auth\/(phone(?:\/|$)|signup$|refresh$|logout-all$)|me(?:\/|$)|profile$|markets?(?:\/|$)|products(?:\/|$)|cart(?:\/|$)|orders(?:\/|$)|images(?:\/|$)|seller\/dashboard$|favorites(?:\/|$)|admin(?:\/|$))/.test(path) ? "go" : null;
}

export async function validateWebsiteBuild(config) {
  let metadata;
  try { metadata = JSON.parse(await readFile(resolve(config.dist, "bakeu-build.json"), "utf8")); }
  catch { if (config.mode === "go") throw Error("Rebuild the website with verified Go account settings before enabling WEB_ACCOUNTS_MODE=go."); return; }
  if (config.mode === "legacy" && metadata.phoneAccounts === true) {
    throw Error("A Go account build requires WEB_ACCOUNTS_MODE=go.");
  }
  if (config.mode === "go") {
    const sameOriginAPI = metadata.goAPI === "/api" && metadata.botAPI === "/api";
    if (!metadata.phoneAccounts || !sameOriginAPI) throw Error("Go account mode requires a Go-enabled website build using the same-origin API gateway.");
  }
}

function json(res, status, error) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(typeof error === "string" ? { error } : error));
}

async function requestBody(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return undefined;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 6 * 1024 * 1024) throw Object.assign(Error("body_limit"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createWebsiteHandler(config, { fetchImpl = fetch, log = console.warn } = {}) {
  return async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    try {
      const url = new URL(req.url, "http://website.invalid");
      if (url.pathname === "/healthz") return json(res, 200, { ok: true, service: "bakeu-website", accountsMode: config.mode });
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        const origin = req.headers.origin;
        if (origin && !config.allowed.includes(origin)) return json(res, 403, "Источник запроса не разрешён.");
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-BakeU-Session, X-BakeU-Account, Idempotency-Key");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
          res.setHeader("Vary", "Origin");
        }
        const destination = apiDestination(url.pathname, req.headers, config.mode);
        if (!destination) return json(res, 404, "Маршрут API не найден.");
        if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
        const body = await requestBody(req);
        const headers = {};
        for (const key of ["authorization", "content-type", "accept", "accept-language", "x-bakeu-session", "x-bakeu-account", "idempotency-key", "if-none-match", "range"]) if (req.headers[key]) headers[key] = req.headers[key];
        if (origin) headers.origin = origin;
        if (destination === "go" && url.pathname.startsWith("/api/auth/") && req.headers.cookie) {
          const cookie = req.headers.cookie.split(";").map((v) => v.trim()).filter((v) => v.startsWith("__Host-bakeu-refresh="));
          if (cookie.length) headers.cookie = cookie.join("; ");
        }
        let response;
        try {
          response = await fetchImpl(config[destination] + url.pathname + url.search, {
            method: req.method, headers, body, redirect: "manual", signal: AbortSignal.timeout(30000),
          });
        } catch (error) {
          const timeout = ["TimeoutError", "AbortError"].includes(error.name);
          log(JSON.stringify({ event: "website_api_failure", service: destination, category: timeout ? "timeout" : "upstream_unavailable" }));
          return json(res, timeout ? 504 : 502, "Сервис временно недоступен. Повторите запрос позже.");
        }
        if (response.status >= 300 && response.status < 400 && response.status !== 304) {
          log(JSON.stringify({ event: "website_api_failure", service: destination, category: "redirect_rejected", httpStatus: response.status }));
          return json(res, 502, "Сервис вернул неверный адрес ответа.");
        }
        for (const key of ["content-type", "etag", "last-modified", "content-disposition", "accept-ranges", "content-range", "retry-after"]) {
          const value = response.headers.get(key); if (value) res.setHeader(key, value);
        }
        res.setHeader("Cache-Control", "no-store");
        if (destination === "go") for (const cookie of response.headers.getSetCookie()) {
          if (cookie.startsWith("__Host-bakeu-refresh=")) res.appendHeader("Set-Cookie", cookie);
        }
        res.writeHead(response.status);
        if (req.method === "HEAD" || [204, 304].includes(response.status)) return res.end();
        const data = await response.arrayBuffer();
        return res.end(Buffer.from(data));
      }
      if (!["GET", "HEAD"].includes(req.method)) return json(res, 405, "Этот маршрут принимает только GET и HEAD.");
      let file;
      try { file = resolve(config.dist, "." + decodeURIComponent(url.pathname)); } catch { return json(res, 400, "Неверный путь."); }
      if (file !== config.dist && !file.startsWith(config.dist + sep)) return json(res, 404, "Файл не найден.");
      let info;
      try { info = await stat(file); } catch { /* SPA fallback below, never for API/assets. */ }
      if (!info?.isFile()) {
        if (extname(file) || url.pathname.startsWith("/assets/")) return json(res, 404, "Файл не найден.");
        file = resolve(config.dist, "index.html");
      }
      const data = await readFile(file);
      res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": file.includes(sep + "assets" + sep) ? "public, max-age=31536000, immutable" : "no-store" });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      json(res, error.status === 413 ? 413 : 500, error.status === 413 ? "Файл или запрос слишком большой." : "Сервис временно недоступен.");
    }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = readWebsiteConfig();
    await validateWebsiteBuild(config);
    const port = Number(process.env.PORT || 8080);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error("PORT must be a valid TCP port.");
    const server = createServer({ requestTimeout: 45000, headersTimeout: 10000 }, createWebsiteHandler(config));
    server.listen(port, "0.0.0.0", () => console.log(`BakeU website listening on port ${port}.`));
    const close = () => server.close(() => process.exit(0));
    process.once("SIGTERM", close); process.once("SIGINT", close);
  } catch { console.error("Website configuration is invalid. Check WEB_* URLs, exact origins and PORT; credentials were not logged."); process.exitCode = 1; }
}

import { createServer } from "node:http";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { HttpError } from "./auth.js";
async function readJson(req) {
  if (
    !(req.headers["content-type"] || "")
      .toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(415, "Ожидается application/json.");
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 2200000) throw new HttpError(413, "Слишком большой запрос.");
    chunks.push(chunk);
  }
  let result;
  try {
    result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Некорректный JSON.");
  }
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new HttpError(400, "Ожидается объект.");
  return result;
}
export function createApiServer({ auth, repo, config }) {
  const allow = createRateLimiter({ limit: 20, windowMs: 15 * 60000 });
  let concurrentAuth = 0;
  return createServer(
    { requestTimeout: 20000, headersTimeout: 10000 },
    async (req, res) => {
      const send = (status, data) => {
        if (res.writableEnded) return;
        res.writeHead(status, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        });
        res.end(JSON.stringify(data));
      };
      try {
        const origin = req.headers.origin;
        if (origin && !config.origins.includes(origin))
          throw new HttpError(403, "Источник запроса не разрешён.");
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Vary", "Origin");
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
          );
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PATCH, OPTIONS",
          );
        }
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          return res.end();
        }
        const path = new URL(req.url, "http://localhost").pathname;
        if (path === "/health" && req.method === "GET")
          return send(200, { ok: true, service: "bakeu-bot-api" });
        if (
          ["/api/auth/register", "/api/auth/login"].includes(path) &&
          req.method === "POST"
        ) {
          const ip = config.trustProxy
            ? String(req.headers["x-real-ip"] || req.socket.remoteAddress)
            : req.socket.remoteAddress;
          if (!allow(ip))
            throw new HttpError(
              429,
              "Слишком много попыток. Попробуйте через 15 минут.",
            );
          if (concurrentAuth >= 4)
            throw new HttpError(503, "Сервер занят. Повторите попытку.");
          concurrentAuth++;
          try {
            const data = await readJson(req);
            const result = await (path.endsWith("/register")
              ? auth.register(data)
              : auth.login(data));
            return send(path.endsWith("/register") ? 201 : 200, result);
          } finally {
            concurrentAuth--;
          }
        }
        if (path === "/api/auth/me" || path === "/api/auth/logout") {
          const session = auth.authenticate(req.headers.authorization);
          if (path.endsWith("/logout") && req.method === "POST") {
            repo.revokeSession(session.hash);
            return send(200, { ok: true });
          }
          if (path.endsWith("/me") && req.method === "GET")
            return send(200, {
              user: session.user,
              application: repo.applicationForUser(session.user.id),
            });
          if (path.endsWith("/me") && req.method === "PATCH") {
            const user = auth.update(session.user, await readJson(req));
            return send(200, {
              user,
              application: repo.applicationForUser(user.id),
            });
          }
        }
        throw new HttpError(404, "Маршрут не найден.");
      } catch (error) {
        send(error.status || 500, {
          error: error.status ? error.message : "Внутренняя ошибка сервера.",
        });
        if (!error.status)
          console.error(
            "API request failed. No request body or credentials were logged.",
          );
      }
    },
  );
}

import { createMiniAppAuth, verifyInitData } from "./miniAppAuth.js";
import { createOrdersApi } from "../orders/api.js";
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
export function createApiServer({ auth, repo, config, ordersSettings = { enabled: false } }) {
  const allow = createRateLimiter({ limit: 20, windowMs: 15 * 60000 });
  let concurrentAuth = 0;
  const miniAuth = createMiniAppAuth(repo, config);
  const goAccounts = ordersSettings.accountsEnabled ? createOrdersApi(ordersSettings) : null;
  const allowMini = createRateLimiter({ limit: 60, windowMs: 60000 });
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
        if (path === "/api/telegram/config" && req.method === "GET")
          return send(200, { enabled: ordersSettings.enabled, apiBase: ordersSettings.enabled ? ordersSettings.baseUrl + "/api" : "" });
        if (path === "/health" && req.method === "GET")
          return send(200, { ok: true, service: "bakeu-bot-api" });
        if (path === "/api/miniapp/go-session" && req.method === "POST") {
          if (!goAccounts) throw new HttpError(503, "Аккаунты Mini App ещё не подключены.");
          const ip = config.trustProxy ? String(req.headers["x-real-ip"] || req.socket.remoteAddress) : req.socket.remoteAddress;
          if (!allowMini(ip)) throw new HttpError(429,"Повторите вход через минуту.");
          const data = await readJson(req);
          const telegramUser = verifyInitData(data.initData, config.token);
          const launch = await goAccounts.launchSession(telegramUser.id);
          if (launch?.linked !== false && !(launch?.linked === true && /^[a-f0-9]{64}$/.test(launch.ticket || "") && /^[a-f0-9]{24}$/.test(launch.uid || ""))) throw new HttpError(502,"Сервер аккаунтов вернул неверный ответ.");
          // The legacy admin-only API keeps its own restricted capability. No
          // customer/seller identity or session is created in SQLite here.
          const admin = config.adminIds.includes(telegramUser.id) ? miniAuth.open(data.initData) : null;
          return send(200,{...launch,telegramUser,admin});
        }
        if (path === "/api/miniapp/session" && req.method === "POST") {
          const ip = config.trustProxy
            ? String(req.headers["x-real-ip"] || req.socket.remoteAddress)
            : req.socket.remoteAddress;
          if (!allowMini(ip))
            throw new HttpError(
              429,
              "Слишком много попыток входа. Подождите минуту.",
            );
          const data = await readJson(req);
          return send(200, miniAuth.open(data.initData));
        }
        if (path === "/api/miniapp/me" && req.method === "GET") {
          const session = miniAuth.authenticate(req.headers.authorization);
          return send(200, {
            user: session.user,
            isAdmin: session.isAdmin,
            links: session.links,
            expiresAt: session.expiresAt,
          });
        }
        if (path.startsWith("/api/miniapp/admin/")) {
          const session = miniAuth.requireAdmin(req.headers.authorization);
          if (path === "/api/miniapp/admin/overview" && req.method === "GET")
            return send(200, { stats: repo.stats() });
          const collection = path.match(
            /^\/api\/miniapp\/admin\/(customers|sellers|applications)$/,
          )?.[1];
          if (collection && req.method === "GET") {
            const page = Number(
              new URL(req.url, "http://localhost").searchParams.get("page") ||
                0,
            );
            if (!Number.isInteger(page) || page < 0 || page > 100000)
              throw new HttpError(400, "Некорректная страница.");
            const rows =
              collection === "applications"
                ? repo.listApplications(page)
                : repo.listUsers(
                    collection === "customers" ? "client" : "seller",
                    page,
                  );
            return send(200, {
              rows: rows.slice(0, 5),
              hasNext: rows.length > 5,
              page,
            });
          }
          const applicationId = path.match(
            /^\/api\/miniapp\/admin\/applications\/([a-f0-9-]{36})\/decision$/,
          )?.[1];
          if (applicationId && req.method === "POST") {
            const body = await readJson(req);
            if (!["Одобрено", "Отклонено"].includes(body.status))
              throw new HttpError(400, "Выберите решение по заявке.");
            const reason =
              typeof body.reason === "string" ? body.reason.trim() : "";
            if (reason.length > 500 || (body.status === "Отклонено" && !reason))
              throw new HttpError(
                400,
                "Укажите причину отказа: до 500 символов.",
              );
            const result = repo.decide(
              applicationId,
              body.status,
              session.user.id,
              reason,
            );
            if (result.missing) throw new HttpError(404, "Заявка не найдена.");
            return send(200, result);
          }
          throw new HttpError(404, "Маршрут не найден.");
        }
        if (path === "/api/shop/open" && req.method === "POST") {
          const session = auth.authenticate(req.headers.authorization);
          const data = await readJson(req);
          const shop = typeof data.shop === "string" ? data.shop.trim() : "";
          const address = typeof data.address === "string" ? data.address.trim() : "";
          if (shop.length < 2 || shop.length > 150 || address.length < 2 || address.length > 250)
            throw new HttpError(400, "Укажите название и адрес магазина (от 2 символов).");
          let lat = null, lng = null;
          if (data.lat !== undefined || data.lng !== undefined) {
            lat = Number(data.lat);
            lng = Number(data.lng);
            if (data.lat == null || data.lng == null || !Number.isFinite(lat) ||
                !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
              throw new HttpError(400, "Некорректная точка на карте.");
          }
          const result = repo.openShop(session.user.id, shop, address, lat, lng);
          if (result.missing) throw new HttpError(404, "Аккаунт не найден.");
          return send(200, { user: result.user, existing: result.existing });
        }
        if (path === "/api/auth/register" && req.method === "POST")
          throw new HttpError(410, "Регистрация доступна только после подтверждения телефона в Telegram.");
        if (
          ["/api/auth/login", "/api/auth/start-registration", "/api/auth/verify-registration", "/api/auth/start-login", "/api/auth/verify-login"].includes(path) &&
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
            const handler = {
              "/api/auth/login": auth.login,
              "/api/auth/start-registration": auth.startRegistration,
              "/api/auth/verify-registration": auth.verifyRegistration,
              "/api/auth/start-login": auth.startLogin,
              "/api/auth/verify-login": auth.verifyLogin,
            }[path];
            const result = await handler(data);
            return send(path.endsWith("/verify-registration") ? 201 : 200, result);
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

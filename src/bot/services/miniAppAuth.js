import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError, tokenHash } from "./auth.js";

// Telegram WebAppData HMAC verification. initDataUnsafe is never accepted.
export function verifyInitData(
  raw,
  botToken,
  { now = Date.now(), maxAgeSeconds = 300 } = {},
) {
  if (typeof raw !== "string" || !raw || raw.length > 16384)
    throw new HttpError(401, "Откройте приложение через Telegram-бота.");
  const params = new URLSearchParams(raw);
  const seen = new Set();
  for (const [key] of params) {
    if (seen.has(key))
      throw new HttpError(401, "Некорректные данные Telegram.");
    seen.add(key);
  }
  const hash = params.get("hash");
  if (!/^[a-f0-9]{64}$/i.test(hash || ""))
    throw new HttpError(401, "Подпись Telegram отсутствует.");
  params.delete("hash");
  const check = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(check).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, "hex")))
    throw new HttpError(
      401,
      "Не удалось подтвердить Telegram. Откройте приложение заново.",
    );
  const date = params.get("auth_date");
  const authDate = Number(date);
  const age = Math.floor(now / 1000) - authDate;
  if (
    !/^\d+$/.test(date || "") ||
    !Number.isSafeInteger(authDate) ||
    age > maxAgeSeconds ||
    age < -30
  )
    throw new HttpError(
      401,
      "Вход устарел. Закройте и откройте Mini App через бота.",
    );
  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    throw new HttpError(401, "Некорректный профиль Telegram.");
  }
  if (
    !user ||
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    typeof user.first_name !== "string" ||
    !user.first_name.trim() ||
    user.first_name.length > 128 ||
    user.is_bot
  )
    throw new HttpError(401, "Некорректный профиль Telegram.");
  return {
    id: String(user.id),
    firstName: user.first_name,
    lastName:
      typeof user.last_name === "string" ? user.last_name.slice(0, 128) : "",
    username:
      typeof user.username === "string" ? user.username.slice(0, 64) : "",
  };
}
export function createMiniAppAuth(repo, config) {
  const view = (user) => ({
    user,
    isAdmin: config.adminIds.includes(String(user.id)),
    links: {
      site: config.siteUrl,
      telegram: config.telegramUrl,
      instagram: config.instagramUrl,
      email: config.supportEmail,
    },
  });
  const api = {
    open: (raw) => {
      const user = verifyInitData(raw, config.token);
      const token = randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 3600000;
      repo.db
        .prepare("DELETE FROM miniapp_sessions WHERE expires_at<?")
        .run(Date.now());
      repo.db
        .prepare("INSERT INTO miniapp_sessions VALUES(?,?,?,?)")
        .run(tokenHash(token), user.id, JSON.stringify(user), expiresAt);
      repo.rememberTelegram({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.username,
      });
      return { ...view(user), token, expiresAt };
    },
    authenticate: (header) => {
      const token = /^Bearer ([a-f0-9]{64})$/.exec(header || "")?.[1];
      if (!token) throw new HttpError(401, "Подтвердите вход через Telegram.");
      const hash = tokenHash(token);
      const row = repo.db
        .prepare(
          "SELECT * FROM miniapp_sessions WHERE token_hash=? AND expires_at>?",
        )
        .get(hash, Date.now());
      if (!row)
        throw new HttpError(
          401,
          "Сессия Mini App истекла. Откройте приложение заново.",
        );
      return {
        ...view(JSON.parse(row.profile)),
        expiresAt: row.expires_at,
        hash,
      };
    },
    requireAdmin: (header) => {
      const session = api.authenticate(header);
      if (!session.isAdmin)
        throw new HttpError(403, "Доступ только для администратора BakeU.");
      return session;
    },
  };
  return api;
}

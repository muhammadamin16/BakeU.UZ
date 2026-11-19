import {
  randomBytes,
  scrypt as scryptCallback,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
const text = (value, key, max = 100) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new HttpError(400, `Некорректное поле: ${key}`);
  return value.trim();
};
export function validateProfile(input, { roleRequired = true } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(400, "Некорректные данные.");
  const firstName = text(input.firstName, "Имя"),
    lastName = text(input.lastName, "Фамилия");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "Введите корректный email.");
  const phone = text(input.phone, "Телефон", 30).replace(/[^0-9]/g, "");
  if (!/^998\d{9}$/.test(phone))
    throw new HttpError(
      400,
      "Телефон должен быть в формате +998 XX XXX XX XX.",
    );
  const role = input.role;
  if (roleRequired && !["client", "seller"].includes(role))
    throw new HttpError(400, "Выберите покупателя или продавца.");
  const out = { firstName, lastName, email, phone, role };
  if (role === "seller") {
    out.company = typeof input.company === "string" ? input.company.trim().slice(0, 150) : "";
    out.location = typeof input.location === "string" ? input.location.trim().slice(0, 250) : "";
  }
  return out;
}
export function createAuth(repo, config, notifications) {
  const session = (user) => {
    const token = randomBytes(32).toString("hex");
    repo.createSession(
      tokenHash(token),
      user.id,
      Date.now() + config.sessionHours * 3600000,
    );
    return { user, token };
  };
  const startChallenge = (fields, passwordHash = "", salt = "") => {
    if (!config.botUsername)
      throw new HttpError(503, "Telegram бот временно не настроен.");
    const token = randomBytes(24).toString("hex");
    repo.savePendingRegistration(tokenHash(token), fields, passwordHash, salt, Date.now() + 10 * 60000);
    return { token, botUrl: `https://t.me/${config.botUsername}?start=verify_${token}`, expiresIn: 600 };
  };
  const verifyChallenge = (input, purpose) => {
    if (typeof input?.token !== "string" || !/^[a-f0-9]{48}$/.test(input.token) ||
        typeof input.code !== "string" || !/^\d{6}$/.test(input.code))
      throw new HttpError(400, "Некорректный код.");
    const hash = tokenHash(input.token);
    const pending = repo.pendingRegistration(hash);
    if (!pending || !pending.telegram_id || !pending.code_hash)
      throw new HttpError(400, "Сначала подтвердите номер в Telegram.");
    const fields = JSON.parse(pending.fields);
    if ((fields.purpose ?? "register") !== purpose)
      throw new HttpError(400, "Некорректный код.");
    if (pending.attempts >= 5 || !repo.pendingAttempt(hash))
      throw new HttpError(429, "Слишком много попыток.");
    if (tokenHash(hash + ":" + input.code) !== pending.code_hash)
      throw new HttpError(400, "Неверный код.");
    if (!repo.deletePending(hash))
      throw new HttpError(400, "Некорректный код.");
    return { pending, fields };
  };
  return {
    startRegistration: async (input) => {
      const fields = validateProfile(input);
      if (input.password !== undefined &&
          (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 128))
        throw new HttpError(400, "Пароль: от 8 до 128 символов.");
      if (repo.findUserByPhone(fields.phone))
        throw new HttpError(409, "Этот номер уже зарегистрирован.");
      const salt = randomBytes(16).toString("hex");
      const passwordHash = input.password === undefined
        ? randomBytes(64).toString("hex")
        : (await scrypt(input.password, salt, 64)).toString("hex");
      return startChallenge(fields, passwordHash, salt);
    },
    startLogin: (input) => {
      const phone = text(input?.phone, "Телефон", 30).replace(/[^0-9]/g, "");
      if (!/^998\d{9}$/.test(phone))
        throw new HttpError(400, "Телефон должен быть в формате +998 XX XXX XX XX.");
      const userId = repo.findUserByPhone(phone)?.id ?? null;
      return startChallenge({ phone, userId, purpose: "login" });
    },
    verifyLogin: (input) => {
      const { fields } = verifyChallenge(input, "login");
      const record = repo.findUserByPhone(fields.phone);
      if (!record || record.id !== fields.userId)
        throw new HttpError(404, "Аккаунт не найден. Зарегистрируйтесь.");
      const user = repo.user(record.id);
      return { ...session(user), application: repo.applicationForUser(user.id) };
    },
    beginTelegramVerification: (token, telegramId) => {
      if (!/^[a-f0-9]{48}$/.test(token)) return false;
      return Boolean(repo.setPendingTelegram(tokenHash(token), telegramId));
    },
    sendTelegramVerification: (token, telegramId, phone) => {
      if (!/^[a-f0-9]{48}$/.test(token)) return null;
      const hash = tokenHash(token);
      const pending = repo.pendingRegistration(hash);
      if (!pending || pending.telegram_id !== String(telegramId) || pending.code_hash || pending.attempts >= 5) return null;
      const fields = JSON.parse(pending.fields);
      if (String(phone).replace(/\D/g, "") !== fields.phone) return null;
      const code = String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, "0");
      const codeHash = tokenHash(hash + ":" + code);
      if (!repo.setPendingCode(hash, telegramId, codeHash)) return null;
      return code;
    },
    verifyRegistration: (input) => {
      const { pending, fields } = verifyChallenge(input, "register");
      if (repo.findUserByPhone(fields.phone))
        throw new HttpError(409, "Этот номер уже зарегистрирован.");
      let user;
      try {
        user = repo.register(fields, pending.password_hash, pending.salt, notifications.registration);
      } catch (error) {
        if (/UNIQUE constraint failed/.test(error.message))
          throw new HttpError(409, "Этот номер уже зарегистрирован.");
        throw error;
      }
      return { ...session(user), application: repo.applicationForUser(user.id) };
    },
    register: async (input) => {
      const fields = validateProfile(input);
      if (
        typeof input.password !== "string" ||
        input.password.length < 8 ||
        input.password.length > 128
      )
        throw new HttpError(400, "Пароль: от 8 до 128 символов.");
      const salt = randomBytes(16).toString("hex");
      const hash = (await scrypt(input.password, salt, 64)).toString("hex");
      let user;
      try {
        user = repo.register(fields, hash, salt, notifications.registration);
      } catch (error) {
        if (
          String(error.code).includes("SQLITE") &&
          /UNIQUE constraint failed/.test(error.message)
        )
          throw new HttpError(
            409,
            "Этот email или телефон уже зарегистрирован.",
          );
        throw error;
      }
      return {
        ...session(user),
        application: repo.applicationForUser(user.id),
      };
    },
    login: async (input) => {
      if (
        (typeof input?.phone !== "string" && typeof input?.email !== "string") ||
        typeof input?.password !== "string" ||
        input.password.length > 128
      )
        throw new HttpError(400, "Введите телефон и пароль.");
      const phone = typeof input.phone === "string" ? input.phone.replace(/\D/g, "") : "";
      const record = phone ? repo.findUserByPhone(phone) : repo.findUserByEmail((input.email || "").trim().toLowerCase());
      const candidate = await scrypt(
        input.password,
        record?.salt || "bakeu-dummy-salt",
        64,
      );
      if (
        !record ||
        !timingSafeEqual(candidate, Buffer.from(record.password_hash, "hex"))
      )
        throw new HttpError(401, "Неверный телефон или пароль.");
      const user = repo.user(record.id);
      return {
        ...session(user),
        application: repo.applicationForUser(user.id),
      };
    },
    authenticate: (header) => {
      const match = /^Bearer ([a-f0-9]{64})$/.exec(header || "");
      if (!match) throw new HttpError(401, "Войдите в аккаунт.");
      const hash = tokenHash(match[1]);
      const found = repo.session(hash);
      if (!found) throw new HttpError(401, "Сессия истекла. Войдите снова.");
      return { user: repo.user(found.user_id), hash };
    },
    update: (user, input) => {
      const allowed = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "company",
        "location",
        "nickname",
        "addresses",
        "avatar",
      ];
      const patch = Object.fromEntries(
        allowed
          .filter((k) => Object.hasOwn(input, k))
          .map((k) => [k, input[k]]),
      );
      const combined = { ...user, ...patch, role: user.role };
      const validated = validateProfile(combined);
      if (
        patch.nickname !== undefined &&
        (typeof patch.nickname !== "string" ||
          (patch.nickname !== "" &&
            !/^[a-zA-Z0-9_.]{3,40}$/.test(patch.nickname)))
      )
        throw new HttpError(
          400,
          "Ник: 3–40 латинских букв, цифр, точек или подчёркиваний.",
        );
      if (
        patch.addresses !== undefined &&
        (!Array.isArray(patch.addresses) ||
          patch.addresses.length > 20 ||
          patch.addresses.some((a) => typeof a !== "string" || a.length > 300))
      )
        throw new HttpError(400, "Некорректные адреса.");
      if (
        patch.avatar !== undefined &&
        (typeof patch.avatar !== "string" ||
          patch.avatar.length > 2100000 ||
          !(
            patch.avatar === "" ||
            /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(
              patch.avatar,
            )
          ))
      )
        throw new HttpError(400, "Некорректное фото.");
      try {
        return repo.updateProfile(user.id, { ...patch, ...validated });
      } catch (error) {
        if (/UNIQUE constraint failed/.test(error.message))
          throw new HttpError(409, "Email или телефон уже используется.");
        throw error;
      }
    },
  };
}

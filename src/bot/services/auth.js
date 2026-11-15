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
  const email = text(input.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
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
    out.company = text(input.company, "Магазин", 150);
    out.location = text(input.location, "Адрес", 250);
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
  return {
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
        typeof input?.email !== "string" ||
        typeof input?.password !== "string" ||
        input.password.length > 128
      )
        throw new HttpError(400, "Введите email и пароль.");
      const record = repo.findUserByEmail(input.email.trim().toLowerCase());
      const candidate = await scrypt(
        input.password,
        record?.salt || "bakeu-dummy-salt",
        64,
      );
      if (
        !record ||
        !timingSafeEqual(candidate, Buffer.from(record.password_hash, "hex"))
      )
        throw new HttpError(401, "Неверный email или пароль.");
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

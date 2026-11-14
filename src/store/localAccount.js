// Local prototype only; server-side authentication is required for production.
const KEY = "bakeu-accounts-v2";
export function readAccounts() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
export const accountId = (a) =>
  a.id || `legacy:${(a.email || a.phone || a.firstName).trim().toLowerCase()}`;
const hex = (bytes) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
async function digest(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: 210000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
export async function registerLocal(form, role) {
  if (!["client", "seller"].includes(role))
    throw Error("Выберите тип аккаунта.");
  if (!crypto.subtle) throw Error("Откройте сайт через HTTPS или localhost.");
  const email = form.email.trim().toLowerCase();
  const records = readAccounts();
  if (
    Object.values(records).some((r) => r.profile.email.toLowerCase() === email)
  )
    throw Error("Этот email уже зарегистрирован в браузере.");
  const { password, ...fields } = form;
  const id = crypto.randomUUID(),
    salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const profile = { ...fields, email, id, role, demo: true };
  records[id] = { profile, salt, hash: await digest(password, salt) };
  localStorage.setItem(KEY, JSON.stringify(records));
  sessionStorage.setItem("bakeu-demo-profile", JSON.stringify(profile));
  return profile;
}
export async function loginLocal(email, password) {
  const record = Object.values(readAccounts()).find(
    (r) => r.profile.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!record || (await digest(password, record.salt)) !== record.hash)
    throw Error(
      "Неверный email или пароль. Старый демо-профиль нужно зарегистрировать заново.",
    );
  sessionStorage.setItem("bakeu-demo-profile", JSON.stringify(record.profile));
  return record.profile;
}
export function saveLocalProfile(previous, next) {
  if (next.nickname && !/^[a-zA-Z0-9_.]{3,40}$/.test(next.nickname))
    throw Error("Ник: 3–40 латинских букв, цифр, точек или подчёркиваний.");
  const id = accountId(previous),
    records = readAccounts();
  const profile = { ...next, id, role: previous.role };
  if (
    Object.values(records).some(
      (r) =>
        r.profile.id !== id &&
        r.profile.email.toLowerCase() === profile.email.trim().toLowerCase(),
    )
  )
    throw Error("Этот email уже используется.");
  if (records[id]) {
    records[id] = { ...records[id], profile };
    localStorage.setItem(KEY, JSON.stringify(records));
  } else localStorage.setItem(`bakeu-profile-${id}`, JSON.stringify(profile));
  sessionStorage.setItem("bakeu-demo-profile", JSON.stringify(profile));
  return profile;
}

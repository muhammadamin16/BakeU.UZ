// BakeU – auth yordamchi funksiyalari.
// Hozircha localStorage ishlatiladi (demo). Backend tayyor bo'lgach,
// quyidagi funksiyalarni fetch/axios so'rovlariga almashtiring.
const USERS_KEY = "bakeu_users";
const SESSION_KEY = "bakeu_session";

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export const normalizePhone = (v) => v.replace(/\D/g, "");
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const isPhone = (v) => /^998\d{9}$/.test(normalizePhone(v));

export const getCurrentUser = () => {
  const id = read(SESSION_KEY, null);
  if (!id) return null;
  return read(USERS_KEY, []).find((u) => u.id === id) || null;
};

export const registerUser = ({ role, firstName, lastName, phone, email, password }) => {
  const users = read(USERS_KEY, []);
  const mail = email.trim().toLowerCase();
  if (users.some((u) => u.email === mail)) {
    throw new Error("Bu email bilan akkaunt allaqachon mavjud");
  }
  if (users.some((u) => u.phone === normalizePhone(phone))) {
    throw new Error("Bu telefon raqam allaqachon ro'yxatdan o'tgan");
  }
  const user = {
    id: crypto.randomUUID(),
    role, // "seller" | "customer"
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: normalizePhone(phone),
    email: mail,
    password, // DEMO: haqiqiy loyihada parolni serverda hash qiling!
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  localStorage.setItem(SESSION_KEY, JSON.stringify(user.id));
  return user;
};

export const loginUser = ({ email, password }) => {
  const user = read(USERS_KEY, []).find(
    (u) => u.email === email.trim().toLowerCase() && u.password === password
  );
  if (!user) throw new Error("Email yoki parol noto'g'ri");
  localStorage.setItem(SESSION_KEY, JSON.stringify(user.id));
  return user;
};

export const updateUser = (id, patch) => {
  const users = read(USERS_KEY, []).map((u) => (u.id === id ? { ...u, ...patch } : u));
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return users.find((u) => u.id === id);
};

export const logoutUser = () => localStorage.removeItem(SESSION_KEY);
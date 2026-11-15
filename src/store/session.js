import { logoutServer } from "../bot/client/accountApi";
const PROFILE_KEY = "bakeu-demo-profile";
const CHAT_ROLE_KEY = "bakeu-chat-role";
const VALID_ROLES = ["client", "seller"];

// Modal shu sahifa yuklanishida yopilganmi? (faqat xotirada, yangilanganda tiklanadi)
let authModalDismissed = false;

/** sessionStorage'dan joriy profilni xavfsiz o'qiydi. */
export function getSessionProfile() {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Foydalanuvchi akkauntga kirganmi? */
export function isLoggedIn() {
  const profile = getSessionProfile();
  return Boolean(profile && VALID_ROLES.includes(profile.role));
}

/** Chiqish: sessiya ma'lumotlarini tozalaydi va modal holatini tiklaydi. */
export function clearSession() {
  void logoutServer().catch(() => {});
  try {
    sessionStorage.removeItem(PROFILE_KEY);
    sessionStorage.removeItem(CHAT_ROLE_KEY);
  } catch {
    /* sessionStorage mavjud emas */
  }
  authModalDismissed = false;
}

export function wasAuthModalDismissed() {
  return authModalDismissed;
}

export function markAuthModalDismissed() {
  authModalDismissed = true;
}

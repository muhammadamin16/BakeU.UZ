const PROFILE_KEY = "bakeu-demo-profile";
const MODAL_DISMISSED_KEY = "bakeu-auth-modal-dismissed";
const VALID_ROLES = ["client", "seller"];

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

/** Modal shu sessiyada yopilganmi? (har safar bosh sahifaga qaytganda bezovta qilmaslik uchun) */
export function wasAuthModalDismissed() {
  try {
    return sessionStorage.getItem(MODAL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAuthModalDismissed() {
  try {
    sessionStorage.setItem(MODAL_DISMISSED_KEY, "1");
  } catch {
    /* sessionStorage mavjud emas, e'tibor bermaymiz */
  }
}
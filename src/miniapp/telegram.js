import { normalizeWebsiteUrl } from "../routes/websiteUrl";

const initialUrl =
  typeof window !== "undefined"
    ? normalizeWebsiteUrl(window.location.href)
    : null;
const fragment = initialUrl ? initialUrl.hash.slice(1) : "";
const launchParams = new URLSearchParams(
  fragment.includes("?") ? fragment.split("?").slice(1).join("?") : fragment,
);
const rawInitData =
  launchParams.get("tgWebAppData") ||
  initialUrl?.searchParams.get("tgWebAppData") ||
  "";
export const miniLaunch = {
  sdk: null,
  initData: rawInitData,
  isTelegram: Boolean(rawInitData),
  mode: Boolean(
    rawInitData ||
      initialUrl?.searchParams.get("miniapp") === "1" ||
      fragment.startsWith("/miniapp"),
  ),
};
export async function prepareTelegram() {
  if (!initialUrl) return;
  if (window.location.href !== initialUrl.href)
    window.history.replaceState(null, "", initialUrl.href);
  const needsSDK = Boolean(
    rawInitData ||
      initialUrl.searchParams.get("miniapp") === "1" ||
      window.Telegram?.WebApp?.initData,
  );
  if (needsSDK && !window.Telegram?.WebApp) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-web-app.js";
        script.async = true;
        const timer = setTimeout(() => reject(Error("SDK timeout")), 6000);
        script.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timer);
          reject(Error("SDK unavailable"));
        };
        document.head.appendChild(script);
      });
    } catch {
      /* Guest browsing remains available if the Telegram SDK cannot load. */
    }
  }
  miniLaunch.sdk = window.Telegram?.WebApp || null;
  miniLaunch.initData = miniLaunch.sdk?.initData || rawInitData;
  miniLaunch.isTelegram = Boolean(miniLaunch.initData);
  miniLaunch.mode = miniLaunch.mode || miniLaunch.isTelegram;
  if (needsSDK) {
    const url = new URL(window.location.href);
    for (const key of [...url.searchParams.keys()])
      if (key.startsWith("tgWebApp")) url.searchParams.delete(key);
    if (rawInitData || !url.hash || !url.hash.startsWith("#/"))
      url.hash =
        url.searchParams.get("screen") === "admin"
          ? "/admin/telegram"
          : "/miniapp";
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
}
export function haptic() {
  try {
    miniLaunch.sdk?.HapticFeedback?.impactOccurred("light");
  } catch {
    /* Unsupported clients keep normal navigation. */
  }
}

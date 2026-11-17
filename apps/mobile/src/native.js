import { installNativeCrypto, nativePasswordDigest } from "./security.js";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Clipboard } from "@capacitor/clipboard";
import { Geolocation } from "@capacitor/geolocation";
import { Keyboard } from "@capacitor/keyboard";
import { Share } from "@capacitor/share";
import { configureDevice } from "../../../src/platform/device.js";
import {
  backAction,
  geolocationError,
  routeFromAppUrl,
  shareUrl,
} from "./navigation.js";

const publicSite =
  import.meta.env?.VITE_PUBLIC_SITE_URL || "https://bake-u-uz-self.vercel.app";
export async function initializeNative(
  apis = { Capacitor, App, Browser, Clipboard, Geolocation, Keyboard, Share },
) {
  const {
    Capacitor: platform,
    App: application,
    Browser: browser,
    Clipboard: clipboard,
    Geolocation: location,
    Keyboard: keyboard,
    Share: share,
  } = apis;
  const handles = [];
  const listen = async (plugin, event, callback) => {
    handles.push(await plugin.addListener(event, callback));
  };
  document.documentElement.dataset.bakeuApp = "true";
  try {
    if (!["uz", "ru"].includes(localStorage.getItem("bakeu:language")))
      localStorage.setItem("bakeu:language", "uz");
  } catch {
    /* The language picker remains usable without browser storage. */
  }
  if (!platform.isNativePlatform()) return;
  installNativeCrypto();
  configureDevice({
    passwordDigest: nativePasswordDigest,
    async position(options) {
      try {
        return await location.getCurrentPosition(options);
      } catch (error) {
        throw geolocationError(error);
      }
    },
    clipboard: (text) => clipboard.write({ string: text }),
    share: (content) => share.share(content),
    publicUrl: (url) => shareUrl(url, publicSite),
  });
  const openRoute = (url) => {
    const route = routeFromAppUrl(url, publicSite);
    if (route) window.location.hash = route;
  };
  await listen(application, "appUrlOpen", ({ url }) => openRoute(url));
  const launch = await application.getLaunchUrl();
  if (launch?.url) openRoute(launch.url);
  if (platform.getPlatform() === "android") {
    await listen(application, "backButton", ({ canGoBack }) => {
      const action = backAction(window.location.hash, canGoBack);
      if (action === "back") window.history.back();
      else if (action === "home") window.location.hash = "/";
      else void application.minimizeApp();
    });
  }
  await listen(keyboard, "keyboardWillShow", () => {
    document.documentElement.dataset.keyboard = "open";
  });
  await listen(keyboard, "keyboardWillHide", () => {
    delete document.documentElement.dataset.keyboard;
  });
  await listen(application, "appStateChange", ({ isActive }) => {
    if (!isActive)
      document.querySelectorAll("audio").forEach((audio) => audio.pause());
  });
  const onClick = (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link || event.defaultPrevented || event.button > 0) return;
    const url = new URL(link.href, window.location.href);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.origin === window.location.origin
    )
      return;
    event.preventDefault();
    void browser.open({ url: url.href }).catch(() => {
      window.open(url.href, "_blank", "noopener");
    });
  };
  document.addEventListener("click", onClick);
  return () => {
    document.removeEventListener("click", onClick);
    handles.forEach((handle) => {
      void handle.remove();
    });
    configureDevice(null);
  };
}

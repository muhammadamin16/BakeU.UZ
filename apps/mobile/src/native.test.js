import test from "node:test";
import assert from "node:assert/strict";
import { initializeNative } from "./native.js";
import {
  configureDevice,
  getDevicePosition,
  writeClipboard,
  shareContent,
  publicShareUrl,
} from "../../../src/platform/device.js";

test("native entry wires device events, user actions and disposal without changing authorization", async () => {
  const descriptors = Object.fromEntries(
    ["document", "window", "localStorage"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const events = {},
    calls = [],
    storage = new Map();
  let click;
  const dataset = {};
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: { dataset },
      querySelectorAll: () => [{ pause: () => calls.push("pause") }],
      addEventListener: (name, fn) => {
        if (name === "click") click = fn;
      },
      removeEventListener: () => calls.push("remove click"),
    },
  });
  const location = {
    hash: "#/",
    href: "https://localhost/",
    origin: "https://localhost",
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location,
      history: { back: () => calls.push("back") },
      open: () => calls.push("fallback browser"),
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
    },
  });
  const listen = async (name, fn) => {
    events[name] = fn;
    return { remove: async () => calls.push("remove " + name) };
  };
  try {
    const cleanup = await initializeNative({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
      App: {
        addListener: listen,
        getLaunchUrl: async () => ({ url: "bakeu://open/#/cart" }),
        minimizeApp: async () => calls.push("minimize"),
      },
      Keyboard: { addListener: listen },
      Clipboard: { write: async (data) => calls.push(data) },
      Share: { share: async (data) => calls.push(data) },
      Browser: { open: async (data) => calls.push(data) },
      Geolocation: {
        getCurrentPosition: async () => ({
          coords: { latitude: 41, longitude: 69 },
        }),
      },
    });
    assert.equal(storage.get("bakeu:language"), "uz");
    assert.equal(location.hash, "/cart");
    const position = await new Promise((resolve, reject) =>
      getDevicePosition(resolve, reject),
    );
    assert.equal(position.coords.latitude, 41);
    await writeClipboard("order");
    await shareContent({ title: "BakeU" });
    assert.ok(calls.some((c) => c?.string === "order"));
    assert.equal(
      publicShareUrl("capacitor://localhost/#/profile?shop=bakeu"),
      "https://bake-u-uz-self.vercel.app/#/profile?shop=bakeu",
    );
    location.hash = "#/cart";
    events.backButton({ canGoBack: true });
    assert.ok(calls.includes("back"));
    location.hash = "#/";
    events.backButton({ canGoBack: false });
    assert.ok(calls.includes("minimize"));
    events.keyboardWillShow();
    assert.equal(dataset.keyboard, "open");
    events.keyboardWillHide();
    assert.equal(dataset.keyboard, undefined);
    events.appStateChange({ isActive: false });
    assert.ok(calls.includes("pause"));
    let prevented = false;
    click({
      button: 0,
      target: {
        closest: () => ({ href: "https://maps.google.com/?q=Tashkent" }),
      },
      preventDefault: () => {
        prevented = true;
      },
    });
    assert.ok(prevented);
    assert.ok(
      calls.some((c) => c?.url === "https://maps.google.com/?q=Tashkent"),
    );
    events.appUrlOpen({ url: "https://evil.test/#/admin" });
    assert.equal(location.hash, "#/");
    cleanup();
    assert.ok(calls.includes("remove backButton"));
    assert.ok(calls.includes("remove click"));
  } finally {
    configureDevice(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

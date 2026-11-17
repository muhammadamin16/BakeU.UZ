// The website uses browser APIs; the mobile entry registers Capacitor providers.
// This adapter never changes account roles or server authorization.
let device = null;
export function configureDevice(provider) {
  device = provider;
}
export function hasNativeLocation() {
  return typeof device?.position === "function";
}
export function supportsLocation() {
  return (
    hasNativeLocation() ||
    (typeof navigator !== "undefined" && Boolean(navigator.geolocation))
  );
}
export function getDevicePosition(success, failure, options) {
  if (hasNativeLocation()) {
    Promise.resolve()
      .then(() => device.position(options))
      .then(success, failure);
  } else if (typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, failure, options);
  } else {
    failure?.({ code: 2, message: "Geolocation is unavailable" });
  }
}
export function canShare() {
  return (
    typeof device?.share === "function" ||
    (typeof navigator !== "undefined" && typeof navigator.share === "function")
  );
}
export async function shareContent(content) {
  if (device?.share) return device.share(content);
  return navigator.share(content);
}
export async function writeClipboard(text) {
  if (device?.clipboard) return device.clipboard(text);
  return navigator.clipboard.writeText(text);
}
export function publicShareUrl(url) {
  return device?.publicUrl ? device.publicUrl(url) : url;
}

export function hasPasswordDigest() {
  return typeof device?.passwordDigest === "function";
}
export async function devicePasswordDigest(password, salt) {
  if (!hasPasswordDigest())
    throw Error("Откройте сайт через HTTPS или localhost.");
  return device.passwordDigest(password, salt);
}

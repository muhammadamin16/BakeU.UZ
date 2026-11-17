import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

// WKWebView custom schemes can omit SubtleCrypto. Match the website's salted
// PBKDF2-SHA256 format exactly; never fall back to an unsalted or fast hash.
export async function nativePasswordDigest(password, salt) {
  return bytesToHex(
    await pbkdf2Async(sha256, utf8ToBytes(password), utf8ToBytes(salt), {
      c: 210000,
      dkLen: 32,
    }),
  );
}
export function secureUuid(source = globalThis.crypto) {
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function installNativeCrypto() {
  if (!globalThis.crypto?.getRandomValues)
    throw Error("Secure randomness is unavailable");
  if (!globalThis.crypto.randomUUID)
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: secureUuid,
      configurable: true,
    });
}

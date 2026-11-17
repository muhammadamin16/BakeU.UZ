import test from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { nativePasswordDigest, secureUuid } from "./security.js";
test("native local-account fallback matches the website's PBKDF2-SHA256 format", async () => {
  const password = "Şirin-öğli-2026!",
    salt = "001122aabbcc";
  assert.equal(
    await nativePasswordDigest(password, salt),
    pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex"),
  );
});
test("UUID fallback uses cryptographic randomness and sets UUIDv4 variant bits", () => {
  let requested = 0;
  const uuid = secureUuid({
    getRandomValues(bytes) {
      requested += 1;
      bytes.fill(255);
      return bytes;
    },
  });
  assert.equal(requested, 1);
  assert.match(
    uuid,
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  assert.notEqual(secureUuid(), secureUuid());
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  configureDevice,
  getDevicePosition,
  supportsLocation,
  canShare,
  shareContent,
  writeClipboard,
  publicShareUrl,
  hasPasswordDigest,
  devicePasswordDigest,
} from "./device.js";
test("native adapter routes GPS, clipboard, sharing and hashing through registered providers", async () => {
  const calls = [];
  configureDevice({
    position: async (o) => ({
      coords: { latitude: 41, longitude: 69 },
      options: o,
    }),
    clipboard: async (text) => calls.push(text),
    share: async (value) => calls.push(value),
    publicUrl: () => "https://bakeu.uz/#/",
    passwordDigest: async () => "digest",
  });
  assert.ok(supportsLocation());
  assert.ok(canShare());
  assert.ok(hasPasswordDigest());
  const position = await new Promise((resolve, reject) =>
    getDevicePosition(resolve, reject, { timeout: 10000 }),
  );
  assert.equal(position.coords.latitude, 41);
  assert.equal(position.options.timeout, 10000);
  await writeClipboard("order");
  await shareContent({ title: "BakeU" });
  assert.deepEqual(calls, ["order", { title: "BakeU" }]);
  assert.equal(publicShareUrl("capacitor://localhost/"), "https://bakeu.uz/#/");
  assert.equal(await devicePasswordDigest("password", "salt"), "digest");
  configureDevice(null);
  assert.equal(hasPasswordDigest(), false);
  assert.equal(publicShareUrl("https://site.test"), "https://site.test");
  await assert.rejects(devicePasswordDigest("p", "s"), /HTTPS/);
});
test("native GPS errors reach the existing caller without fabricated coordinates", async () => {
  configureDevice({
    position: async () => {
      throw { code: 1, message: "Permission denied" };
    },
  });
  const error = await new Promise((resolve) =>
    getDevicePosition(() => assert.fail("unexpected location"), resolve),
  );
  assert.equal(error.code, 1);
  configureDevice(null);
});

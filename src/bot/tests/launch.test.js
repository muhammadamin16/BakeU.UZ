import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readConfig } from "../config/index.js";
import { DEFAULT_MINI_APP_URL } from "../config/public.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";
import { adminKeyboard } from "../keyboards/adminKeyboard.js";
const env = {
  BOT_TOKEN: "12345:fake-test-token-not-a-real-credential",
  ADMIN_IDS: "12345",
  SITE_URL: "https://www.bakeu.uz",
  USE_WEB_APP: "false",
  ALLOWED_ORIGINS: "https://www.bakeu.uz",
};
test("Mini App launcher overrides legacy link settings without changing secrets", () => {
  const before = { ...env };
  const config = readConfig(env, { miniApp: true });
  assert.equal(config.useWebApp, true);
  assert.equal(new URL(config.siteUrl).origin, DEFAULT_MINI_APP_URL);
  assert.equal(config.token, env.BOT_TOKEN);
  assert.deepEqual(config.adminIds, ["12345"]);
  assert.deepEqual(env, before);
  assert.ok(config.origins.includes(DEFAULT_MINI_APP_URL));
  const main = mainKeyboard(config).inline_keyboard[0][0];
  assert.ok(main.web_app);
  assert.ok(!main.url);
  assert.equal(new URL(main.web_app.url).searchParams.get("miniapp"), "1");
  const admin = adminKeyboard(config)
    .inline_keyboard.flat()
    .find((x) => x.web_app);
  assert.equal(new URL(admin.web_app.url).searchParams.get("screen"), "admin");
});
test("custom Mini App HTTPS URL is supported and HTTP is rejected", () => {
  const config = readConfig(
    { ...env, MINI_APP_URL: "https://example.com/app/" },
    { miniApp: true },
  );
  assert.equal(config.siteUrl, "https://example.com/app/");
  assert.ok(config.origins.includes("https://example.com"));
  assert.throws(
    () =>
      readConfig(
        { ...env, MINI_APP_URL: "http://example.com" },
        { miniApp: true },
      ),
    /HTTPS/,
  );
  assert.equal(
    readConfig({ ...env, MINI_APP_URL: "   " }, { miniApp: true }).siteUrl,
    DEFAULT_MINI_APP_URL + "/",
  );
});
test("legacy website launch still respects explicit settings", () => {
  const config = readConfig(env);
  assert.equal(config.useWebApp, false);
  assert.equal(config.siteUrl, "https://www.bakeu.uz/");
  assert.ok(mainKeyboard(config).inline_keyboard[0][0].url);
});
test("CLI check reports the actual Mini App mode without contacting Telegram or printing credentials", () => {
  const directory = mkdtempSync(join(tmpdir(), "bakeu-launch-test-"));
  try {
    const result = spawnSync(
      process.execPath,
      ["index.js", "--miniapp", "--check"],
      {
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        env: {
          ...process.env,
          ...env,
          MINI_APP_URL: "",
          DATABASE_PATH: join(directory, "test.sqlite"),
        },
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Telegram Mini App \(web_app\)/);
    assert.ok(result.stdout.includes(DEFAULT_MINI_APP_URL));
    assert.ok(!result.stdout.includes(env.BOT_TOKEN));
    assert.ok(!result.stdout.includes("https://www.bakeu.uz"));
    assert.match(result.stdout, /Telegram was not contacted/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

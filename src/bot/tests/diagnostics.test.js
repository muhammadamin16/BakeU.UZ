import test from "node:test";
import assert from "node:assert/strict";
import {
  createTelegram,
  TelegramError,
  networkErrorCode,
} from "../services/telegram.js";
import { formatStartupError } from "../utils/startupError.js";
import { ConfigError, readConfig } from "../config/index.js";

test("network failures show actionable cause, never token or fetch URL", async () => {
  const token = "12345:secret-token-do-not-display-12345";
  const bot = createTelegram(token, {
    fetchImpl: async () => {
      throw new TypeError(
        `fetch failed at https://api.telegram.org/bot${token}`,
        { cause: Object.assign(new Error("socket"), { code: "ETIMEDOUT" }) },
      );
    },
  });
  await assert.rejects(bot.call("getMe"), (error) => {
    assert.equal(error.code, 0);
    assert.equal(error.networkCode, "ETIMEDOUT");
    const message = formatStartupError(error, "telegram");
    assert.match(message, /ETIMEDOUT/);
    assert.match(message, /getMe/);
    assert.ok(!message.includes(token));
    assert.ok(!message.includes("/bot12345"));
    return true;
  });
});
test("nested Windows aggregate network errors and timeouts are identified", () => {
  const error = new TypeError("fetch failed", {
    cause: new AggregateError([
      Object.assign(new Error(), { code: "ENETUNREACH" }),
    ]),
  });
  assert.equal(networkErrorCode(error), "ENETUNREACH");
  assert.equal(networkErrorCode({ name: "TimeoutError" }), "TIMEOUT");
  assert.equal(
    networkErrorCode({ code: "secret-unknown-code" }),
    "NETWORK_ERROR",
  );
});
test("config errors for social links and email are no longer hidden", () => {
  const env = {
    BOT_TOKEN: "12345:abcdefghijklmnopqrstuvwxy",
    ADMIN_IDS: "12345",
  };
  for (const [key, value] of [
    ["TELEGRAM_URL", "@channel"],
    ["INSTAGRAM_URL", "username"],
    ["SUPPORT_EMAIL", "invalid"],
  ]) {
    assert.throws(
      () => readConfig({ ...env, [key]: value }),
      (error) => {
        assert.ok(error instanceof ConfigError);
        assert.match(formatStartupError(error), new RegExp(key));
        return true;
      },
    );
  }
});
test("invalid tokens, duplicate process, port and unknown errors have safe descriptions", () => {
  assert.match(formatStartupError(new TelegramError(401)), /BOT_TOKEN/);
  assert.match(formatStartupError(new TelegramError(409)), /another process/);
  assert.match(
    formatStartupError({ code: "EADDRINUSE" }, "api"),
    /port is already in use/,
  );
  assert.match(
    formatStartupError(new Error("sensitive information"), "database"),
    /DATABASE_PATH/,
  );
  assert.ok(
    !formatStartupError(new Error("sensitive information")).includes(
      "sensitive information",
    ),
  );
});

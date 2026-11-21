import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

test("Railway bot-only build context loads the entrypoint with orders enabled or disabled", async () => {
  const temp = await mkdtemp(join(tmpdir(), "bakeu-bot-deploy-"));
  const app = join(temp, "app");
  try {
    // Docker/Railway Root Directory is src/bot. Never copy the sibling website
    // directory, private environment, database, dependencies or test fixtures.
    await cp(fileURLToPath(new URL("../", import.meta.url)), app, {
      recursive: true,
      filter: (path) => {
        const name = basename(path);
        return (
          !["data", "node_modules", "tests"].includes(name) &&
          !name.startsWith(".env") &&
          !/\.sqlite|\.log$/.test(name)
        );
      },
    });
    for (const [enabled, accountsEnabled] of [["false", "false"], ["true", "false"], ["false", "true"], ["true", "true"]]) {
      const result = spawnSync(
        process.execPath,
        ["index.js", "--miniapp", "--check"],
        {
          cwd: app,
          encoding: "utf8",
          timeout: 15000,
          env: {
            PATH: process.env.PATH,
            SYSTEMROOT: process.env.SYSTEMROOT,
            BOT_TOKEN: "123456:" + "test_only_token_".repeat(3),
            ADMIN_IDS: "12345",
            MINI_APP_URL: "https://bakeu.example",
            RAILWAY_ENVIRONMENT: "deployment-test",
            PORT: "3000",
            DATABASE_PATH: join(temp, "test-data", "bakeu.sqlite"),
            TELEGRAM_ORDERS_ENABLED: enabled,
            GO_ACCOUNTS_ENABLED: accountsEnabled,
            GO_BACKEND_URL: "https://backend.example",
            TELEGRAM_BRIDGE_TOKEN: "test_only_bridge_".repeat(3),
          },
        },
      );
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Configuration and SQLite schema OK/);
      assert.match(result.stdout, /Telegram was not contacted/);
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

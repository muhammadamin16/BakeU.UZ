import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { devPortPlugin, readDevPort, selectDevPort } from "./dev-port.js";

test("the old 5173 default and custom ports are validated", () => {
  assert.equal(readDevPort(), 5173);
  assert.equal(readDevPort("8080"), 8080);
  for (const value of ["-1", "65536", "1.5", "1e3", "foo", "0", 0])
    assert.throws(() => readDevPort(value), /VITE_DEV_PORT/);
});

test("Windows-reserved and occupied ports fall back without using API port 3001", async () => {
  const attempts = [];
  const selected = await selectDevPort(5173, "127.0.0.1", async (port) => {
    attempts.push(port);
    if (port === 5173)
      throw Object.assign(Error("Reserved"), { code: "EACCES" });
    if (port === 3000)
      throw Object.assign(Error("Busy"), { code: "EADDRINUSE" });
  });
  assert.deepEqual(attempts, [5173, 3000, 3002]);
  assert.deepEqual(selected, { port: 3002, reason: "EACCES" });
});

test("an actual busy loopback socket is detected before starting Vite", async () => {
  const blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  try {
    const selected = await selectDevPort(blocker.address().port, "127.0.0.1");
    assert.notEqual(selected.port, blocker.address().port);
    assert.equal(selected.reason, "EADDRINUSE");
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
});

test("unexpected network errors are not disguised as port reservations", async () => {
  await assert.rejects(
    selectDevPort(5173, "invalid-host", async () => {
      throw Object.assign(Error("Bad host"), { code: "EADDRNOTAVAIL" });
    }),
    { code: "EADDRNOTAVAIL" },
  );
});

test("production, middleware tests and explicit strict-port requests skip automatic selection", async () => {
  for (const [config, environment] of [
    [{}, { command: "build" }],
    [{}, { command: "serve", isPreview: true }],
    [{ server: { middlewareMode: true } }, { command: "serve" }],
    [{ server: { strictPort: true } }, { command: "serve" }],
  ])
    assert.equal(await devPortPlugin().config(config, environment), undefined);
});

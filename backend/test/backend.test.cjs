const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomInt } = require("node:crypto");

const testUrl = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL =
  testUrl || "postgresql://unused:unused@127.0.0.1:65431/unused";
process.env.NODE_ENV = "test";
process.env.CORS_ORIGINS = "https://bakeu.test,capacitor://localhost";
process.env.ENABLE_API_DOCS = "true";
const {
  validateEnvironment,
  ConfigurationError,
} = require("../dist/config/environment");
const { createApplication } = require("../dist/bootstrap");
const { DatabaseService } = require("../dist/database/database.service");
const { users, shops } = require("../dist/database/schema");
const { ConfigService } = require("@nestjs/config");
const { eq } = require("drizzle-orm");

const settings = (overrides = {}) => ({
  DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/bakeu",
  ...overrides,
});

test("configuration validates ports, database URLs, CORS and production settings without exposing values", () => {
  const config = validateEnvironment(settings());
  assert.equal(config.API_PORT, 4000);
  assert.ok(config.CORS_ORIGINS.includes("capacitor://localhost"));
  for (const invalid of [
    { API_PORT: "0" },
    { API_PORT: 0 },
    { API_PORT: "65536" },
    { API_PORT: "1.5" },
    { DATABASE_URL: "sqlite:///data.db" },
    { DATABASE_URL: "private-password-is-not-a-url" },
    { CORS_ORIGINS: "*" },
    { CORS_ORIGINS: "https://*.example.test" },
    { CORS_ORIGINS: "," },
    { CORS_ORIGINS: "https://bakeu.test/path" },
    { ENABLE_API_DOCS: "yes" },
    { NODE_ENV: "unknown" },
    { NODE_ENV: "production", CORS_ORIGINS: "" },
  ])
    assert.throws(
      () => validateEnvironment(settings(invalid)),
      ConfigurationError,
    );
  assert.throws(
    () => validateEnvironment({}),
    (error) => !error.message.includes("private-password"),
  );
  const production = validateEnvironment(
    settings({ NODE_ENV: "production", CORS_ORIGINS: "https://bakeu.test" }),
  );
  assert.equal(production.ENABLE_API_DOCS, false);
});

test("HTTP liveness, failed readiness, exact CORS, JSON errors and OpenAPI work without a database", async () => {
  const app = await createApplication({ logger: false });
  app.get(DatabaseService).isReady = async () => false;
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  try {
    let response = await fetch(base + "/api/v1/health/live");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).service, "bakeu-backend");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.ok(
      !response.headers
        .get("content-security-policy")
        .includes("upgrade-insecure-requests"),
    );
    response = await fetch(base + "/api/v1/health/ready");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: "not_ready",
      database: "unavailable",
    });
    response = await fetch(base + "/api/v1/health", {
      headers: { Origin: "https://bakeu.test" },
    });
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "https://bakeu.test",
    );
    for (const origin of [
      "https://bakeu",
      "https://bakeu.test.attacker.test",
    ]) {
      response = await fetch(base + "/api/v1/health", {
        headers: { Origin: origin },
      });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    }
    response = await fetch(base + "/api/v1/health", {
      method: "OPTIONS",
      headers: {
        Origin: "capacitor://localhost",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "capacitor://localhost",
    );
    for (const path of [
      "/api/v1/users",
      "/api/v1/auth/login",
      "/api/v1/orders",
    ]) {
      response = await fetch(base + path);
      assert.equal(response.status, 404);
      assert.match(response.headers.get("content-type"), /application\/json/);
    }
    response = await fetch(base + "/api/openapi.json");
    assert.equal(response.status, 200);
    const openapi = await response.json();
    assert.ok(openapi.paths["/api/v1/health/ready"]);
    response = await fetch(base + "/api/v1/not-implemented", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "a".repeat(300000) }),
    });
    assert.equal(response.status, 413);
  } finally {
    await app.close();
  }
});

test(
  "PostgreSQL migrations enforce uniqueness and shop ownership; readiness confirms the schema",
  { skip: !testUrl },
  async () => {
    const database = new DatabaseService(
      new ConfigService({ DATABASE_URL: testUrl }),
    );
    const id = randomUUID();
    const email = "backend-test-" + id + "@example.test";
    const phone = "+998" + String(randomInt(1000000000)).padStart(9, "0");
    let shopId;
    try {
      assert.equal(await database.isReady(), true);
      const [user] = await database.db
        .insert(users)
        .values({
          id,
          email,
          phone,
          firstName: "Test",
          lastName: "Seller",
          role: "SELLER",
        })
        .returning();
      assert.equal(user.status, "ACTIVE");
      await assert.rejects(
        database.db.insert(users).values({
          email,
          phone: "+998" + String(randomInt(1000000000)).padStart(9, "0"),
          firstName: "Duplicate",
          lastName: "Test",
        }),
        (error) => error.cause?.code === "23505",
      );
      await assert.rejects(
        database.db.insert(users).values({
          email: "other-" + email,
          phone,
          firstName: "DuplicatePhone",
          lastName: "Test",
        }),
        (error) => error.cause?.code === "23505",
      );
      const [shop] = await database.db
        .insert(shops)
        .values({ ownerId: id, name: "Test bakery", address: "Test address" })
        .returning();
      shopId = shop.id;
      assert.equal(shop.status, "PENDING");
      await assert.rejects(
        database.db.delete(users).where(eq(users.id, id)),
        (error) => error.cause?.code === "23503",
      );
    } finally {
      if (shopId) await database.db.delete(shops).where(eq(shops.id, shopId));
      await database.db.delete(users).where(eq(users.id, id));
      await database.onModuleDestroy();
    }
    const app = await createApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    try {
      const response = await fetch(
        (await app.getUrl()) + "/api/v1/health/ready",
      );
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: "ready",
        database: "connected",
      });
    } finally {
      await app.close();
    }
  },
);

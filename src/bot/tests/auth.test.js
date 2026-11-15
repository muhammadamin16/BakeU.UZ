import test from "node:test";
import assert from "node:assert/strict";
import { setup, fields } from "./helpers.js";
test("registration persists one user, hashes password, queues only public data", async () => {
  const { db, repo, auth } = setup();
  try {
    const result = await auth.register(fields());
    assert.equal(repo.stats().customers, 1);
    assert.equal(result.user.server, true);
    assert.equal(Object.hasOwn(result.user, "password"), false);
    const row = repo.findUserByEmail(fields().email);
    assert.notEqual(row.password_hash, fields().password);
    assert.equal(
      auth.authenticate(`Bearer ${result.token}`).user.id,
      result.user.id,
    );
    const queue = repo.pendingOutbox();
    assert.equal(queue.length, 1);
    assert.ok(!queue[0].payload.includes(fields().password));
    await assert.rejects(auth.register(fields()), (e) => e.status === 409);
    assert.equal(repo.pendingOutbox().length, 1);
    await assert.rejects(
      auth.login({ email: fields().email, password: "wrong-password" }),
      (e) => e.status === 401,
    );
    const login = await auth.login(fields());
    assert.equal(login.user.id, result.user.id);
  } finally {
    db.close();
  }
});
test("seller creates pending application; decisions are idempotent", async () => {
  const { db, repo, auth } = setup();
  try {
    const result = await auth.register(fields("seller"));
    const a = result.application;
    assert.equal(a.status, "На проверке");
    assert.equal(repo.pendingOutbox().length, 2);
    assert.equal(repo.decide(a.id, "Одобрено", "12345").changed, true);
    assert.equal(
      repo.decide(a.id, "Отклонено", "12345", "late").changed,
      false,
    );
    assert.equal(repo.applicationForUser(result.user.id).status, "Одобрено");
  } finally {
    db.close();
  }
});
test("profile update cannot change role, session revoke is effective", async () => {
  const { db, auth, repo } = setup();
  try {
    const result = await auth.register(fields());
    const session = auth.authenticate(`Bearer ${result.token}`);
    const changed = auth.update(session.user, {
      firstName: "Новое имя",
      role: "seller",
      password: "never-store-this",
      addresses: ["Ташкент"],
    });
    assert.equal(changed.role, "client");
    assert.equal(changed.firstName, "Новое имя");
    assert.ok(!JSON.stringify(changed).includes("never-store-this"));
    repo.revokeSession(session.hash);
    assert.throws(
      () => auth.authenticate(`Bearer ${result.token}`),
      (e) => e.status === 401,
    );
  } finally {
    db.close();
  }
});
test("invalid fields and arbitrary roles are rejected", async () => {
  const { db, auth } = setup();
  try {
    await assert.rejects(
      auth.register({ ...fields(), role: "admin" }),
      (e) => e.status === 400,
    );
    await assert.rejects(
      auth.register({ ...fields(), phone: "123" }),
      (e) => e.status === 400,
    );
    await assert.rejects(
      auth.register({ ...fields(), password: "tiny" }),
      (e) => e.status === 400,
    );
  } finally {
    db.close();
  }
});

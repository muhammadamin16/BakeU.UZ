import test from "node:test";
import assert from "node:assert/strict";
import { SQLitePermissionError } from "../database/permissions.js";
import { formatStartupError } from "../utils/startupError.js";

test("SQLite permission failures identify the volume and journals without leaking errors", () => {
  for (const code of ["EACCES", "EPERM", "ERR_SQLITE_ERROR"]) {
    const error = Object.assign(Error("secret-token /private/customer/file"), { code });
    const message = formatStartupError(error, "database");
    assert.match(message, /DATABASE_PATH/); assert.match(message, /parent directory/); assert.match(message, /-wal/); assert.match(message, /-shm/);
    assert.ok(!message.includes("secret-token")); assert.ok(!message.includes("/private/customer"));
  }
  const message = formatStartupError(new SQLitePermissionError("unsafe_path"), "database");
  assert.match(message, /existing \/data volume/); assert.match(message, /No database is replaced or deleted/);
});

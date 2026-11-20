import assert from "node:assert/strict";
import test from "node:test";
import { createGoSession } from "./goSession.js";

test("restores from a cookie and coalesces concurrent JWT refresh after 401", async () => {
  let rotations = 0;
  let signedOut = false;
  const fetchImpl = async (path, options) => {
    if (path.endsWith("/auth/refresh")) {
      assert.equal(options.credentials, "include");
      assert.equal(options.headers["X-BakeU-Session"], "browser");
      if (signedOut) return Response.json({ error: "expired" }, { status: 401 });
      rotations++;
      return Response.json({ token: `access-${rotations}` });
    }
    if (path.endsWith("/auth/logout")) {
      signedOut = true;
      return new Response(null, { status: 204 });
    }
    assert.equal(options.credentials, "omit");
    if (options.headers.Authorization === "Bearer access-1" && options.method === "PATCH") {
      return Response.json({ error: "expired" }, { status: 401 });
    }
    return Response.json({ name: "Bakery" });
  };
  const api = createGoSession("/api", { fetchImpl });
  assert.equal((await api.request("/market/mine")).name, "Bakery");
  await Promise.all([
    api.request("/market/mine", "PATCH", { name: "Bakery" }),
    api.request("/market/mine", "PATCH", { name: "Bakery" }),
  ]);
  assert.equal(rotations, 2);
  await api.logout();
  await assert.rejects(api.request("/market/mine"), { status: 401 });
});

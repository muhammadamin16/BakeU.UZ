import test from "node:test";
import assert from "node:assert/strict";
import { accountBuildStatus } from "./deployment-metadata.mjs";

test("deployment verification checks actual build flags against runtime mode", () => {
  const website = "https://bakeu.test", build = { schemaVersion: 1, phoneAccounts: true, goAPI: "/api", botAPI: "/api" };
  assert.equal(accountBuildStatus("go", build, "go").ok, true);
  assert.equal(accountBuildStatus("go", { ...build, goAPI: website + "/api" }).ok, false);
  assert.equal(accountBuildStatus("legacy", { ...build, phoneAccounts: false }).ok, true);
  assert.equal(accountBuildStatus("legacy", build).category, "account_mode_mismatch");
  assert.equal(accountBuildStatus("go", { ...build, phoneAccounts: false }).category, "account_mode_mismatch");
  assert.equal(accountBuildStatus("go", { ...build, goAPI: "https://other.up.railway.app/api" }).category, "cross_site_cookie_api");
  assert.equal(accountBuildStatus("legacy", { ...build, phoneAccounts: false }, "go").category, "unexpected_account_mode");
  assert.equal(accountBuildStatus("go", {}).ok, false);
});

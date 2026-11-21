import test from "node:test";
import assert from "node:assert/strict";
import { accountBuildStatus } from "./deployment-metadata.mjs";

test("deployment verification checks actual build flags against runtime mode", () => {
  const website = "https://bakeu.test", build = { schemaVersion: 1, phoneAccounts: true, goAPI: "/api" };
  assert.equal(accountBuildStatus("go", build, website, "go").ok, true);
  assert.equal(accountBuildStatus("go", { ...build, goAPI: website + "/api" }, website).ok, true);
  assert.equal(accountBuildStatus("legacy", { ...build, phoneAccounts: false }, website).ok, true);
  assert.equal(accountBuildStatus("legacy", build, website).category, "account_mode_mismatch");
  assert.equal(accountBuildStatus("go", { ...build, phoneAccounts: false }, website).category, "account_mode_mismatch");
  assert.equal(accountBuildStatus("go", { ...build, goAPI: "https://other.up.railway.app/api" }, website).category, "cross_site_cookie_api");
  assert.equal(accountBuildStatus("legacy", { ...build, phoneAccounts: false }, website, "go").category, "unexpected_account_mode");
  assert.equal(accountBuildStatus("go", {}, website).ok, false);
});

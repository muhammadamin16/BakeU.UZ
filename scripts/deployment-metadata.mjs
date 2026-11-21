// Public flags/URLs only; no credentials or authenticated requests are needed.
export function accountBuildStatus(mode, build, website, expectedMode) {
  if (!["go", "legacy"].includes(mode) || build?.schemaVersion !== 1 || typeof build.phoneAccounts !== "boolean") return { ok: false, category: "invalid_build_metadata" };
  if (expectedMode && mode !== expectedMode) return { ok: false, category: "unexpected_account_mode" };
  if (build.phoneAccounts !== (mode === "go")) return { ok: false, category: "account_mode_mismatch" };
  if (mode === "go" && !["/api", website + "/api"].includes(build.goAPI)) return { ok: false, category: "cross_site_cookie_api" };
  return { ok: true, category: "coherent_public_configuration" };
}

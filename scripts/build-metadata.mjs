export function publicBuildMetadata(env) {
  const api = (value, name) => {
    value = (value || "").trim().replace(/\/$/, "");
    if (!value || value === "/api") return value;
    let url;
    try { url = new URL(value); } catch { throw Error(`${name} must be /api or a public API URL.`); }
    if (url.username || url.password || url.search || url.hash || url.hostname.endsWith(".railway.internal") ||
        !(url.protocol === "https:" || url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))) throw Error(`${name} must not contain credentials, private service hosts or query parameters.`);
    return value;
  };
  const result = { schemaVersion: 1, phoneAccounts: env.VITE_GO_PHONE_ACCOUNTS === "true", goAPI: api(env.VITE_GO_API_URL, "VITE_GO_API_URL"), botAPI: api(env.VITE_ACCOUNT_API_URL, "VITE_ACCOUNT_API_URL") };
  const revision = env.RAILWAY_GIT_COMMIT_SHA;
  if (typeof revision === "string" && /^[0-9a-f]{40}$/i.test(revision)) result.commit = revision.toLowerCase();
  if (result.phoneAccounts && !result.goAPI) throw Error("VITE_GO_PHONE_ACCOUNTS requires VITE_GO_API_URL. Build with /api for the website gateway.");
  return result;
}

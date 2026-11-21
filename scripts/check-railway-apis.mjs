// Read-only public deployment checks. No login, challenge, claim or order writes.
const defaults = {
  website: "https://bakeu-website-production.up.railway.app",
  bot: "https://bakeu-bot-production.up.railway.app",
  go: "https://bakeu-backend-production.up.railway.app",
};
function origin(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    !(url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw Error("Use public HTTPS origins without credentials or queries.");
  return url.origin;
}
const website = origin(process.env.BAKEU_WEBSITE_URL || defaults.website);
const bot = origin(process.env.BAKEU_BOT_URL || defaults.bot);
const go = origin(process.env.BAKEU_GO_URL || defaults.go);
const tests = [
  ["website_html", website, (r, body) => r.ok && /text\/html/.test(r.headers.get("content-type") || "") && /<html/i.test(body)],
  ["website_gateway", website + "/healthz", (r, b) => r.ok && JSON.parse(b).service === "bakeu-website"],
  ["bot_liveness", bot + "/health", (r, b) => r.ok && JSON.parse(b).service === "bakeu-bot-api"],
  ["go_liveness", go + "/healthz", (r, b) => r.ok && JSON.parse(b).status === "ok"],
  ["go_transaction_readiness", go + "/readyz", (r, b) => r.ok && JSON.parse(b).status === "ok"],
  ["gateway_public_catalog", website + "/api/markets?limit=1", (r, b) => r.ok && Array.isArray(JSON.parse(b).items)],
  ["gateway_private_route_guard", website + "/api/integrations/telegram/diagnostics", (r) => r.status === 404],
  ["browser_refresh_preflight", website + "/api/auth/refresh", (r) => r.status === 204 && r.headers.get("access-control-allow-origin") === website,
    { method: "OPTIONS", headers: { Origin: website, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-bakeu-session" } }],
];
let failed = 0;
for (const [name, url, check, init] of tests) {
  try {
    const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(12000) });
    const body = await response.text();
    const ok = check(response, body);
    if (!ok) failed++;
    console.log(JSON.stringify({ check: name, ok, httpStatus: response.status }));
  } catch { failed++; console.log(JSON.stringify({ check: name, ok: false, category: "network_or_invalid_response" })); }
}
console.log(JSON.stringify({ failed, limitation: "Public probes do not verify ownership, login, orders, persistence or Telegram delivery." }));
if (failed) process.exitCode = 1;

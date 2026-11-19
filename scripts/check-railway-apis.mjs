// Safe, non-mutating production smoke checks. Node.js 24+.
// Usage: node scripts/check-railway-apis.mjs
const website = process.env.BAKEU_WEBSITE_URL || "https://bakeu-website-production.up.railway.app";
const bot = process.env.BAKEU_BOT_URL || "https://bakeuuz-production.up.railway.app";
const tests = [
  {
    name: "Website HTML",
    url: website,
    init: { method: "GET" },
    check: (response, text) => response.ok && /text\/html/i.test(response.headers.get("content-type") || "") && /<html/i.test(text),
  },
  {
    name: "Bot API health",
    url: new URL("/health", bot),
    init: { method: "GET" },
    check: (response, text) => response.ok && JSON.parse(text).service === "bakeu-bot-api",
  },
  {
    name: "Telegram registration CORS preflight",
    url: new URL("/api/auth/start-registration", bot),
    init: {
      method: "OPTIONS",
      headers: {
        Origin: new URL(website).origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    },
    check: (response) =>
      response.status === 204 &&
      response.headers.get("access-control-allow-origin") === new URL(website).origin,
  },
  {
    name: "Telegram login route responds with JSON",
    url: new URL("/api/auth/start-login", bot),
    init: {
      method: "POST",
      headers: { Origin: new URL(website).origin, "Content-Type": "application/json" },
      body: "{}",
    },
    // Empty input is intentionally invalid; route must return JSON 400, not HTML 404.
    check: (response, text) => response.status === 400 &&
      /application\/json/i.test(response.headers.get("content-type") || "") &&
      typeof JSON.parse(text).error === "string",
  },
];
let failed = 0;
for (const check of tests) {
  try {
    const response = await fetch(check.url, { ...check.init, signal: AbortSignal.timeout(12000) });
    const body = await response.text();
    if (!check.check(response, body)) {
      failed++;
      console.error("FAIL", check.name, response.status, String(check.url));
    } else {
      console.log("PASS", check.name);
    }
  } catch (error) {
    failed++;
    console.error("FAIL", check.name, error.message);
  }
}
if (failed) {
  console.error(failed, "deployment checks failed. Inspect Railway variables, public port, CORS, and deploy logs.");
  process.exitCode = 1;
}

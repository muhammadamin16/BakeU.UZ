const categories = new Set(["bridge_unauthorized", "bridge_forbidden", "route_missing", "upstream_rate_limited", "upstream_unavailable", "transport_timeout", "transport_network", "dns", "connection_refused", "tls", "invalid_json", "invalid_contract", "configuration_disabled", "sqlite", "telegram_rate_limited", "telegram_blocked", "telegram_failed", "telegram_uncertain", "unexpected"]);
export function networkCategory(error) {
  const codes = new Set();
  const visit = (value, depth = 0) => { if (!value || depth > 4) return; if (typeof value.code === "string") codes.add(value.code); if (["AbortError", "TimeoutError"].includes(value.name)) codes.add("TIMEOUT"); visit(value.cause, depth + 1); for (const child of value.errors || []) visit(child, depth + 1); };
  visit(error);
  if (codes.has("TIMEOUT") || codes.has("ETIMEDOUT")) return "transport_timeout";
  if (codes.has("ENOTFOUND") || codes.has("EAI_AGAIN")) return "dns";
  if (codes.has("ECONNREFUSED")) return "connection_refused";
  if ([...codes].some((code) => /CERT|TLS|SSL/.test(code))) return "tls";
  return "transport_network";
}

// Never serialize error messages, request paths, URLs, headers, IDs or payloads.
export function createWorkerDiagnostics(component, { log = console.warn, now = Date.now } = {}) {
  const recent = new Map();
  return (stage, error) => {
    const raw = Number(error?.httpStatus ?? error?.status ?? error?.code);
    const httpStatus = Number.isInteger(raw) && raw >= 100 && raw < 600 ? raw : 0;
    let category = categories.has(error?.category) ? error.category : String(error?.code || "").startsWith("SQLITE_") ? "sqlite" : "unexpected";
    if (category === "unexpected" && error?.name === "BridgeError") category = "invalid_contract";
    const key = `${stage}:${category}:${httpStatus}`;
    const old = recent.get(key), count = (old?.count || 0) + 1;
    if (old && now() - old.at < 60000) { recent.set(key, { ...old, count }); return; }
    recent.set(key, { at: now(), count: 0 });
    log(JSON.stringify({ event: "notification_worker_failure", component, stage, category, httpStatus, occurrences: count }));
  };
}

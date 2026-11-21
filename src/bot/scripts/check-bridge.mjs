import { readOrdersConfig } from "../orders/config.js";
import { networkCategory } from "../services/workerDiagnostics.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Does not claim a lease, send Telegram messages or mutate any application data.
export async function checkBridge(settings, { fetchImpl = fetch } = {}) {
  if (!(settings.enabled || settings.accountsEnabled)) return { ok: false, category: "configuration_disabled", httpStatus: 0 };
  let response;
  try {
    response = await fetchImpl(settings.baseUrl + "/api/integrations/telegram/diagnostics", {
      redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${settings.token}` },
    });
  } catch (error) { return { ok: false, category: networkCategory(error), httpStatus: 0 }; }
  const httpStatus = response.status;
  if (!response.ok) return { ok: false, httpStatus, category: ({ 401: "bridge_unauthorized", 403: "bridge_forbidden", 404: "route_missing" })[httpStatus] || "upstream_unavailable" };
  let data;
  try { data = await response.json(); } catch { return { ok: false, httpStatus, category: "invalid_json" }; }
  if (data.bridgeVersion !== 1 || typeof data.databaseConnected !== "boolean" || typeof data.transactionsAvailable !== "boolean") return { ok: false, httpStatus, category: "invalid_contract" };
  return { ok: data.databaseConnected && data.transactionsAvailable, httpStatus, category: data.transactionsAvailable ? "ready" : "mongo_transactions_required", phoneAccounts: data.phoneAccounts === true, refreshSessions: data.refreshSessions === true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = await checkBridge(readOrdersConfig()); console.log(JSON.stringify(result)); if (!result.ok) process.exitCode = 1; }
  catch { console.error(JSON.stringify({ ok: false, category: "invalid_configuration" })); process.exitCode = 1; }
}

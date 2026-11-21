import { readOrdersConfig, readBridgeConnection } from "../orders/config.js";
import { networkCategory } from "../services/workerDiagnostics.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const storageCodes = new Set(["MONGO_STANDALONE", "MONGO_REPLICA_SET_UNINITIALIZED", "MONGO_PRIMARY_UNAVAILABLE", "MONGO_SESSIONS_UNAVAILABLE", "MONGO_WIRE_VERSION_UNSUPPORTED", "MONGO_PROBE_UNAUTHORIZED", "MONGO_AUTHENTICATION_FAILED", "MONGO_PROBE_TIMEOUT", "MONGO_NETWORK_UNAVAILABLE", "MONGO_CAPABILITY_CHECK_FAILED", "MONGO_TRANSACTIONS_READY"]);
const storageReason = (data) => storageCodes.has(data?.storage?.code) ? { storageCode: data.storage.code } : storageCodes.has(data?.code) ? { storageCode: data.code } : {};

// Does not claim a lease, send Telegram messages or mutate any application data.
export async function checkBridge(settings, { fetchImpl = fetch } = {}) {
  if (!(settings.enabled || settings.accountsEnabled || settings.diagnosticsEnabled)) return { ok: false, category: "configuration_disabled", httpStatus: 0 };
  let response;
  try {
    response = await fetchImpl(settings.baseUrl + "/api/integrations/telegram/diagnostics", {
      redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${settings.token}` },
    });
  } catch (error) { return { ok: false, category: networkCategory(error), httpStatus: 0 }; }
  const httpStatus = response.status;
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const reason = storageReason(data);
    return { ok: false, httpStatus, category: ({ 401: "bridge_unauthorized", 403: "bridge_forbidden", 404: "route_missing" })[httpStatus] || (reason.storageCode ? "database_readiness_failed" : "upstream_unavailable"), ...reason };
  }
  let data;
  try { data = await response.json(); } catch { return { ok: false, httpStatus, category: "invalid_json" }; }
  if (data.bridgeVersion !== 1 || typeof data.databaseConnected !== "boolean" || typeof data.transactionsAvailable !== "boolean") return { ok: false, httpStatus, category: "invalid_contract" };
  return { ok: data.databaseConnected && data.transactionsAvailable, httpStatus, category: !data.databaseConnected ? "database_unavailable" : data.transactionsAvailable ? "ready" : "mongo_transactions_required", ...storageReason(data), phoneAccounts: data.phoneAccounts === true, refreshSessions: data.refreshSessions === true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    // Explicit operator preflight is useful BEFORE account/order activation.
    // It parses the existing connection only; process.env and production flags
    // stay unchanged, and this command still performs just one GET.
    const settings = process.argv.includes("--configured") ? { diagnosticsEnabled: true, ...readBridgeConnection() } : readOrdersConfig();
    const result = await checkBridge(settings); console.log(JSON.stringify(result)); if (!result.ok) process.exitCode = 1;
  }
  catch { console.error(JSON.stringify({ ok: false, category: "invalid_configuration" })); process.exitCode = 1; }
}

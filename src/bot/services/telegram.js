// Only allowlisted error codes are retained: never log fetch URLs or raw errors.
export function networkErrorCode(error) {
  const known = new Set([
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "CERT_HAS_EXPIRED",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "ERR_TLS_CERT_ALTNAME_INVALID",
  ]);
  const queue = [error];
  const seen = new Set();
  while (queue.length && seen.size < 20) {
    const item = queue.shift();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    if (known.has(item.code)) return item.code;
    if (item.name === "TimeoutError" || item.name === "AbortError")
      return "TIMEOUT";
    if (item.cause) queue.push(item.cause);
    if (Array.isArray(item.errors)) queue.push(...item.errors.slice(0, 10));
  }
  return "NETWORK_ERROR";
}

export class TelegramError extends Error {
  constructor(code, retryAfter, networkCode = "", method = "") {
    super(`Telegram API error ${code}`);
    this.code = code;
    this.retryAfter = retryAfter;
    this.networkCode = networkCode;
    this.method = method;
  }
}
export function createTelegram(token, { fetchImpl = fetch } = {}) {
  const call = async (method, payload = {}, signal) => {
    let response;
    try {
      response = await fetchImpl(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal:
            signal ||
            AbortSignal.timeout(method === "getUpdates" ? 40000 : 15000),
        },
      );
    } catch (error) {
      throw new TelegramError(0, undefined, networkErrorCode(error), method);
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new TelegramError(response.status, undefined, "", method);
    }
    if (!data.ok)
      throw new TelegramError(
        data.error_code || response.status,
        data.parameters?.retry_after,
        "",
        method,
      );
    return data.result;
  };
  return {
    call,
    send: (id, payload) => call("sendMessage", { chat_id: id, ...payload }),
    answer: (id, text = "") =>
      call("answerCallbackQuery", { callback_query_id: id, text }),
    edit: (chatId, messageId, payload) =>
      call("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        ...payload,
      }),
  };
}

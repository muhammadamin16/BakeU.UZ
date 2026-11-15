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
  const fetchTelegram = async (method, options, signal) => {
    try {
      return await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        ...options,
        signal:
          signal ||
          AbortSignal.timeout(method === "getUpdates" ? 40000 : 20000),
      });
    } catch (error) {
      throw new TelegramError(0, undefined, networkErrorCode(error), method);
    }
  };
  const decode = async (response, method) => {
    let data;
    try {
      data = await response.json();
    } catch {
      throw new TelegramError(response.status, undefined, "", method);
    }
    if (!data || !data.ok) {
      const error = new TelegramError(
        data?.error_code || response.status,
        data?.parameters?.retry_after,
        "",
        method,
      );
      if (
        error.code === 400 &&
        /message is not modified/i.test(data?.description || "")
      )
        error.reason = "not_modified";
      throw error;
    }
    return data.result;
  };
  const call = async (method, payload = {}, signal) =>
    decode(
      await fetchTelegram(
        method,
        {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
        signal,
      ),
      method,
    );
  return {
    call,
    send: (id, payload) => call("sendMessage", { chat_id: id, ...payload }),
    photo: async (id, bytes, payload = {}) => {
      const form = new FormData();
      form.append("chat_id", String(id));
      form.append(
        "photo",
        new Blob([bytes], { type: "image/png" }),
        "bakeu-welcome.png",
      );
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined)
          form.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
      }
      return decode(
        await fetchTelegram("sendPhoto", { body: form }),
        "sendPhoto",
      );
    },
    answer: (id, text = "") =>
      call("answerCallbackQuery", { callback_query_id: id, text }),
    edit: (chatId, messageId, payload) =>
      call("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        ...payload,
      }),
    editCaption: (chatId, messageId, payload) =>
      call("editMessageCaption", {
        chat_id: chatId,
        message_id: messageId,
        ...payload,
      }),
  };
}

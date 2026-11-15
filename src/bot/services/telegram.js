export class TelegramError extends Error {
  constructor(code, retryAfter) {
    super(`Telegram API error ${code}`);
    this.code = code;
    this.retryAfter = retryAfter;
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
    } catch {
      throw new TelegramError(0);
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new TelegramError(response.status);
    }
    if (!data.ok)
      throw new TelegramError(
        data.error_code || response.status,
        data.parameters?.retry_after,
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

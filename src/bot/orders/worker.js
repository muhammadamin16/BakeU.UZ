import { BridgeError, validateIdentity, validateOrder } from "./api.js";
import { ownOrder } from "../../telegramOrders/domain.js";
import { orderCard } from "./views.js";
const messages = {
  accepted: "✅ Продавец принял заказ",
  preparing: "👨‍🍳 Ваш заказ готовится",
  ready: "🥐 Ваш заказ готов",
  delivering: "🚚 Ваш заказ в пути",
  delivered: "✅ Заказ доставлен",
  completed: "🎉 Спасибо за заказ в BakeU!",
  rejected: "❌ Продавец отклонил заказ",
  cancelled: "❌ Заказ отменён",
  pending: "Ожидает подтверждения",
};

// MongoDB owns leases, attempts, deduplication and the website inbox. This map
// only retries delivery receipts while this process remains alive; it is not an order store.
export function createOrdersWorker(api, telegram, { enabled = false } = {}) {
  let busy = false;
  const receipts = new Map();
  async function ack(id, receipt) {
    try {
      await api.ack(receipt.job, receipt.messageId);
      receipts.delete(id);
    } catch (error) {
      if (error.status === 409) receipts.delete(id);
    }
  }
  return async () => {
    if (!enabled || busy) return;
    busy = true;
    try {
      for (const [id, receipt] of receipts) await ack(id, receipt);
      if (receipts.size >= 500) return;
      const batch = await api.claim();
      if (!Array.isArray(batch.jobs) || batch.jobs.length > 10)
        throw new BridgeError(502);
      for (const job of batch.jobs) {
        if (receipts.has(job.id)) continue;
        try {
          const who = validateIdentity(
            job.recipient,
            job.recipient?.telegramId,
          );
          validateOrder(job.order);
          if (
            !who ||
            job.recipient.botStarted !== true ||
            !ownOrder(who, job.order) ||
            !["order.created", "order.status_changed"].includes(job.kind) ||
            (job.kind === "order.status_changed" && who.user.role !== "CLIENT")
          )
            throw new BridgeError(403);
        } catch {
          await api.fail(job, { state: "blocked", code: 403 });
          continue;
        }
        // begin is durable and CAS guarded. A lease expired in 'sending' becomes
        // 'uncertain', never automatically pending: Telegram has no send idempotency API.
        let attempt;
        try {
          attempt = await api.begin(job);
        } catch {
          continue;
        }
        if (attempt.started !== true) continue;
        let result;
        try {
          const payload = orderCard(job.order, {
            seller: job.recipient.user.role === "SELLER",
            notification: job.kind === "order.created",
          });
          if (job.kind === "order.status_changed")
            payload.text = `<b>${messages[job.order.status]}</b>\n\n${payload.text}`;
          result = await telegram.send(job.recipient.telegramId, {
            ...payload,
            parse_mode: "HTML",
          });
          if (!Number.isInteger(result?.message_id))
            throw new Error("Unknown Telegram receipt");
        } catch (error) {
          const code = Number(error.code) || 0;
          const failure =
            code === 429
              ? {
                  state: "retry",
                  code,
                  retryAt: new Date(
                    Date.now() +
                      Math.min(
                        Math.max(Number(error.retryAfter) || 2, 1),
                        86400,
                      ) *
                        1000,
                  ).toISOString(),
                }
              : code === 403
                ? { state: "blocked", code }
                : code >= 400 && code < 500
                  ? { state: "failed", code }
                  : { state: "uncertain", code };
          try {
            await api.fail(job, failure);
          } catch {
            /* Durable sending state is recovered by Go's lease sweeper. */
          }
          continue;
        }
        const receipt = {
          job: { id: job.id, leaseToken: job.leaseToken },
          messageId: result.message_id,
        };
        receipts.set(job.id, receipt);
        await ack(job.id, receipt);
      }
    } finally {
      busy = false;
    }
  };
}

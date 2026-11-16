import { translateText } from "../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Snowflake, Sun } from "lucide-react";
import { ConfirmAction } from "./AdminUI";
import { useAdminStore } from "../store/adminStore";
import { nextOrderStatuses, shopRestriction } from "../utils/management";
import { subscriptionStatus } from "../utils/subscriptions";

export function AccountStatusAction({ person, kind }) {
  const [open, setOpen] = useState(false);
  const freeze = useAdminStore((state) => state.freezeAccount);
  const thaw = useAdminStore((state) => state.thawAccount);
  const active = person.status === "Активен";
  const label = active ? "Заморозить аккаунт" : "Разморозить аккаунт";
  return (
    <>
      <button className="ad-btn" onClick={() => setOpen(true)}>
        {active ? <Snowflake size={16} /> : <Sun size={16} />}
        {translateText(label)}
      </button>
      {open && (
        <ConfirmAction
          title={translateText(label)}
          confirmLabel={active ? "Заморозить" : "Разморозить"}
          requireReason={active}
          onClose={() => setOpen(false)}
          description={translateText(
            active
              ? `Аккаунт «${person.name}»: запретим новые заказы и публикацию товаров в демо-панели. Активные подписки продавца будут приостановлены с сохранением остатка срока.`
              : `Восстановим операции для «${person.name}». Автоматически возобновятся только подписки, остановленные этой заморозкой.`,
          )}
          onConfirm={(reason) =>
            active ? freeze(kind, person.id, reason) : thaw(kind, person.id)
          }
        />
      )}
    </>
  );
}

export function SubscriptionAction({ subscription, onRenew }) {
  const data = useAdminStore();
  const [open, setOpen] = useState(false);
  const status = subscriptionStatus(subscription);
  const paused = status === "Приостановлена";
  const owner = data.sellers.find((row) => row.id === subscription.sellerId);
  const blocked = paused && (!owner || owner.status !== "Активен");
  if (status === "Истекла")
    return onRenew ? (
      <button className="ad-btn small" onClick={onRenew}>
        {translateText("Продлить")}
      </button>
    ) : (
      <Link
        className="ad-btn small"
        to={`/admin/subscriptions/${encodeURIComponent(subscription.id)}?edit=1`}
      >
        {translateText("Продлить")}{" "}
        <ArrowUpRight
          size={12}
          className="ad-inline-arrow"
          aria-hidden="true"
        />
      </Link>
    );
  return (
    <>
      <button
        className="ad-btn small"
        disabled={blocked}
        title={translateText(
          blocked ? "Сначала разморозьте продавца" : undefined,
        )}
        onClick={() => setOpen(true)}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
        {translateText(paused ? "Возобновить" : "Приостановить")}
      </button>
      {open && (
        <ConfirmAction
          title={translateText(
            paused ? "Возобновить подписку" : "Приостановить подписку",
          )}
          confirmLabel={paused ? "Возобновить" : "Приостановить"}
          requireReason={!paused}
          onClose={() => setOpen(false)}
          description={translateText(
            paused
              ? "Вернём доступ и перенесём окончание подписки на сохранённый остаток срока."
              : "Доступ по тарифу будет остановлен. Неиспользованное время сохранится до возобновления. Банковские списания это действие не изменяет.",
          )}
          onConfirm={(reason) =>
            data.manageSubscription(
              subscription.id,
              paused ? "resume" : "pause",
              reason,
            )
          }
        />
      )}
    </>
  );
}

export function ProductStatusAction({ product }) {
  const data = useAdminStore();
  const [open, setOpen] = useState(false);
  const published = product.status === "Опубликован";
  const restriction = published ? "" : shopRestriction(data, product.shopId);
  return (
    <>
      <button
        className="ad-btn small"
        disabled={Boolean(restriction)}
        title={translateText(restriction || undefined)}
        onClick={() => setOpen(true)}
      >
        {translateText(published ? "Скрыть" : "Опубликовать")}
      </button>
      {open && (
        <ConfirmAction
          title={translateText(
            published ? "Скрыть товар" : "Опубликовать товар",
          )}
          description={translateText(
            `Товар «${product.name}»: ${published ? "перестанет быть доступен для новых заказов в демо-панели" : "станет доступен для новых заказов в демо-панели"}.`,
          )}
          onClose={() => setOpen(false)}
          onConfirm={() =>
            data.save("products", {
              id: product.id,
              status: published ? "Скрыт" : "Опубликован",
            })
          }
        />
      )}
    </>
  );
}

export function OrderStatusActions({ order }) {
  const save = useAdminStore((state) => state.save);
  const [target, setTarget] = useState("");
  const labels = {
    "В работе": "Взять в работу",
    Доставлен: "Завершить",
    Отменён: "Отменить заказ",
  };
  return (
    <>
      {nextOrderStatuses(order.status).map((status) => (
        <button
          key={status}
          className={`ad-btn small ${status === "Отменён" ? "red" : ""}`}
          onClick={() => setTarget(status)}
        >
          {translateText(labels[status])}
        </button>
      ))}
      {target && (
        <ConfirmAction
          title={translateText(labels[target])}
          description={translateText(
            `Заказ ${order.id}: «${order.status}» → «${target}». Изменение будет записано в историю.`,
          )}
          requireReason={target === "Отменён"}
          onClose={() => setTarget("")}
          onConfirm={(reason) =>
            save("orders", {
              id: order.id,
              status: target,
              ...(reason
                ? {
                    notes: `${order.notes ? order.notes + "\n" : ""}Отмена: ${reason}`,
                  }
                : {}),
            })
          }
        />
      )}
    </>
  );
}

export function ApplicationDecisionActions({ application }) {
  const decide = useAdminStore((state) => state.decide);
  const [decision, setDecision] = useState("");
  if (application.status !== "На проверке") return null;
  return (
    <>
      <button
        className="ad-btn small green"
        onClick={() => setDecision("Одобрено")}
      >
        {translateText("✓ Одобрить")}
      </button>
      <button
        className="ad-btn small red"
        onClick={() => setDecision("Отклонено")}
      >
        {translateText("× Отклонить")}
      </button>
      {decision && (
        <ConfirmAction
          title={translateText(
            decision === "Одобрено" ? "Одобрить заявку" : "Отклонить заявку",
          )}
          description={translateText(
            `Магазин «${application.shop}»: ${decision === "Одобрено" ? "создадим магазин и привяжем продавца" : "заявка будет отклонена"}.`,
          )}
          requireReason={decision === "Отклонено"}
          onClose={() => setDecision("")}
          onConfirm={(reason) => decide(application.id, decision, reason)}
        />
      )}
    </>
  );
}

export function subscriptionExpiry(row) {
  return row.expiresAt
    ? new Date(row.expiresAt).getTime()
    : new Date(`${row.until}T23:59:59.999`).getTime();
}

export function subscriptionStatus(row, now = Date.now()) {
  if (row.status === "Приостановлена") return row.status;
  const expires = subscriptionExpiry(row);
  if (!Number.isFinite(expires)) return "Истекла";
  if (expires <= now) return "Истекла";
  return expires - now <= 7 * 86400000 ? "Скоро истекает" : "Активна";
}

export function localDate(value) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function pauseSubscriptionRecord(row, now, reason = "manual") {
  if (row.status === "Приостановлена") return row;
  const remainingMs = subscriptionExpiry(row) - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0)
    throw Error(
      "Истёкшую подписку нельзя приостановить. Сначала продлите срок.",
    );
  return {
    ...row,
    status: "Приостановлена",
    pausedAt: new Date(now).toISOString(),
    remainingMs,
    pauseReason: reason,
  };
}

export function resumeSubscriptionRecord(row, now) {
  if (row.status !== "Приостановлена") return row;
  if (!(Number(row.remainingMs) > 0))
    throw Error(
      "Остаток срока не сохранён. Укажите новую дату окончания в редакторе подписки.",
    );
  const expiresAt = new Date(now + Number(row.remainingMs)).toISOString();
  const next = {
    ...row,
    expiresAt,
    until: localDate(expiresAt),
    status: "Активна",
  };
  delete next.pausedAt;
  delete next.remainingMs;
  delete next.pauseReason;
  return { ...next, status: subscriptionStatus(next, now) };
}

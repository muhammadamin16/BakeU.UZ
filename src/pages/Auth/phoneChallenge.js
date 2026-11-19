export function readPhoneChallenge(key) {
  try {
    const record = JSON.parse(sessionStorage.getItem(key) || "null");
    return record?.token && record.expiresAt > Date.now() ? record : null;
  } catch {
    return null;
  }
}

export function savePhoneChallenge(key, { token, botUrl, expiresIn }, details = {}) {
  const record = {
    ...details,
    token,
    botUrl,
    expiresAt: Date.now() + (expiresIn ?? 600) * 1000,
  };
  sessionStorage.setItem(key, JSON.stringify(record));
  return record;
}

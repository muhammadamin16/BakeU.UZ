export function isAdmin(config, userId) {
  return config.adminIds.includes(String(userId));
}

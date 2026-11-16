// Browser demo routes use only this browser's data, including on the public site.
// Server-backed admin pages must always use verified Telegram authorization.
export function canPreviewAdminDemo({ pathname, miniMode = false }) {
  if (miniMode) return false;
  return (
    /^\/admin\/?$/.test(pathname) ||
    /^\/admin\/(customers|sellers|shops|products|orders|subscriptions)(\/[^/]+)?\/?$/.test(
      pathname,
    ) ||
    /^\/admin\/(applications|notifications|history|settings)\/?$/.test(pathname)
  );
}

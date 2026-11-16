// Local preview exposes browser-only demo pages, never server-backed admin data.
export function canPreviewLocalAdmin({
  development,
  hostname,
  pathname,
  miniMode = false,
}) {
  if (
    !development ||
    miniMode ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)
  )
    return false;
  return (
    /^\/admin\/?$/.test(pathname) ||
    /^\/admin\/(customers|sellers|shops|products|orders|subscriptions)(\/[^/]+)?\/?$/.test(
      pathname,
    ) ||
    /^\/admin\/(applications|notifications|history|settings)\/?$/.test(pathname)
  );
}

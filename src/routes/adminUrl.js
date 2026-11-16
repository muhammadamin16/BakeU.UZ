// HashRouter needs /#/admin. Accept the common /admin development URL too.
// Telegram launch parameters and explicit hash routes must stay untouched.
export function normalizeAdminUrl(input) {
  const url = new URL(input);
  if (!/^\/admin(?:\/|$)/.test(url.pathname) || url.hash) return url;
  if (
    url.searchParams.get("miniapp") === "1" ||
    [...url.searchParams.keys()].some((key) => key.startsWith("tgWebApp"))
  )
    return url;
  const route = url.pathname + url.search;
  url.pathname = "/";
  url.search = "";
  url.hash = route;
  return url;
}

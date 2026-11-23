// Accept direct admin and account links in the HashRouter website.
// Telegram launch parameters and explicit hash routes must stay untouched.
export function normalizeWebsiteUrl(input) {
  const url = new URL(input);
  if (!/^\/(?:admin(?:\/|$)|(?:account\/orders|login|register)\/?$)/.test(url.pathname) || url.hash) return url;
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

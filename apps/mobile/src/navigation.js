const page =
  /^\/(?:$|(?:login|register|profile|seller|cart|checkout|favorites|map|ai|messages|miniapp)\/?$|product\/[^/]+\/?$|orders(?:\/[^/]+)?\/?$|admin(?:\/(?:telegram|customers|sellers|shops|applications|products|orders|subscriptions|notifications|history|settings)(?:\/[^/]+)?)?\/?$)/;
export function routeFromAppUrl(value, publicSite) {
  try {
    const url = new URL(value),
      site = new URL(publicSite);
    if (url.username || url.password) return null;
    if (
      !(url.protocol === "bakeu:" && url.hostname === "open") &&
      !(url.protocol === "https:" && url.origin === site.origin)
    )
      return null;
    const route = url.hash.startsWith("#/")
      ? url.hash.slice(1)
      : url.pathname + url.search;
    const pathname = decodeURIComponent(route.split("?")[0]);
    if (
      pathname.includes("..") ||
      pathname.includes("\\") ||
      !page.test(pathname)
    )
      return null;
    return route;
  } catch {
    return null;
  }
}
export function shareUrl(value, publicSite) {
  const site = new URL(publicSite),
    current = new URL(value);
  if (site.protocol !== "https:" || site.username || site.password)
    throw Error("A public HTTPS site URL is required");
  site.hash = current.hash;
  return site.href;
}
export function backAction(hash, canGoBack) {
  return hash && hash !== "#/" && hash !== "#"
    ? canGoBack
      ? "back"
      : "home"
    : "minimize";
}
export function geolocationError(cause) {
  const code = [
    "OS-PLUG-GLOC-0003",
    "OS-PLUG-GLOC-0008",
    "OS-PLUG-GLOC-0009",
    1,
  ].includes(cause?.code)
    ? 1
    : cause?.code === "OS-PLUG-GLOC-0010" || cause?.code === 3
      ? 3
      : 2;
  return { code, message: cause?.message || "Location is unavailable" };
}

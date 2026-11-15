export function authReturnTo(params) {
  const next = params.get("next") || "";
  return /^\/(checkout|orders|messages)([/?]|$)/.test(next) &&
    !/[\\\r\n#]/.test(next)
    ? next
    : "/profile";
}
export function authLink(path, params) {
  const next = authReturnTo(params);
  return (
    path + (next === "/profile" ? "" : "?next=" + encodeURIComponent(next))
  );
}

export function validateGoBase(value, origin = globalThis.location?.origin) {
  if (value.startsWith("//"))
    throw new Error("Адрес сервера BakeU настроен неправильно.");
  const url = new URL(value, origin);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error("Адрес сервера BakeU настроен неправильно.");
  return url.href.replace(/\/$/, "").replace(/\/api$/, "") + "/api";
}
export async function discoverGoApi({
  fetchImpl = fetch,
  configured = "",
  botBase = "/api",
} = {}) {
  if (configured) return validateGoBase(configured);
  const response = await fetchImpl(
    botBase.replace(/\/$/, "") + "/telegram/config",
    { signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Не удалось подключиться к серверу BakeU.");
  const result = await response.json();
  if (!result.enabled || !result.apiBase)
    throw new Error("Сервис аккаунтов и заказов ещё не подключён.");
  return validateGoBase(result.apiBase);
}
// Tokens live only in this authenticated session, never in the legacy Node or demo account stores.
export function createGoTransport(
  base,
  { fetchImpl = fetch, browserSession = false } = {},
) {
  base = validateGoBase(base);
  let token = "";
  async function send(path, options = {}) {
    const response = await fetchImpl(base + path, {
      method: options.method || "GET",
      redirect: "error",
      signal: options.signal || AbortSignal.timeout(15000),
      credentials: browserSession ? "include" : "omit",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let result;
    try {
      result = response.status === 204 ? {} : await response.json();
    } catch {
      throw new Error("Сервер BakeU вернул неверный ответ.");
    }
    if (!response.ok) {
      const error = new Error(result.error || "Запрос не выполнен.");
      error.status = response.status;
      throw error;
    }
    return result;
  }
  async function request(path, options = {}) {
    try {
      return await send(path, options);
    } catch (error) {
      if (error.status !== 401 || !browserSession || path.startsWith("/auth/"))
        throw error;
      const refreshed = await send("/auth/refresh", {
        method: "POST",
        body: {},
        headers: { "X-BakeU-Session": "browser" },
      });
      token = refreshed.token;
      return send(path, options);
    }
  }
  return {
    request,
    async login(email, password) {
      const result = await send("/auth/login", {
        method: "POST",
        body: { email, password },
        headers: browserSession ? { "X-BakeU-Session": "browser" } : {},
      });
      if (!result.token || !result.user?.uid)
        throw new Error("Вход не подтверждён сервером.");
      token = result.token;
      return result.user;
    },
    async logout() {
      try {
        if (browserSession)
          await send("/auth/logout", {
            method: "POST",
            body: {},
            headers: { "X-BakeU-Session": "browser" },
          });
      } finally {
        token = "";
      }
    },
  };
}

// Keep a page bound to the account it displayed, including across a shared-session refresh.
export function pinGoAccount(transport, uid, role) {
  if (!uid) return transport;
  const verify = (user) => {
    if (user?.uid !== uid || user.role !== role)
      throw new Error("Сессия изменилась. Войдите в аккаунт заново.");
  };
  return {
    ...transport,
    async request(path, options = {}) {
      if (options.method && !["GET", "HEAD"].includes(options.method))
        verify(await transport.request("/me"));
      const result = await transport.request(path, { ...options, headers: { ...options.headers, "X-BakeU-Account": uid } });
      if (path === "/me") verify(result);
      return result;
    },
  };
}

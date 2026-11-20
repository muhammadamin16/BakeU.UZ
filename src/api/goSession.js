export function createGoSession(base, { fetchImpl = globalThis.fetch, locks = globalThis.navigator?.locks } = {}) {
  let access = "";
  let pending;
  const sessionMode = { "X-BakeU-Session": "browser" };
  const locked = (action) =>
    locks?.request("bakeu-go-session", action) ?? action();

  async function call(path, { method = "GET", body, headers, signal, credentials = "omit" } = {}) {
    const multipart = body instanceof FormData;
    const timeout = AbortSignal.timeout(15000);
    const response = await fetchImpl(base + path, {
      method, credentials,
      headers: { ...(body !== undefined && !multipart && { "Content-Type": "application/json" }), ...headers },
      body: body === undefined || multipart ? body : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok || (data === null && response.status !== 204)) {
      const error = new Error(data?.error || `Ошибка API (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function authRequest(path, body) {
    return call(path, { method: "POST", body, headers: sessionMode, credentials: "include" });
  }

  function refresh() {
    if (!pending) {
      pending = locked(async () => {
        const data = await authRequest("/auth/refresh");
        access = data.token;
      }).finally(() => { pending = undefined; });
    }
    return pending;
  }

  async function requestWithOptions(path, { method, body, headers, signal } = {}) {
    signal?.throwIfAborted();
    if (!access) await refresh();
    const sent = access;
    const protectedRequest = (token) =>
      call(path, { method, body, signal, headers: { ...headers, Authorization: `Bearer ${token}` } });
    try {
      return await protectedRequest(sent);
    } catch (error) {
      signal?.throwIfAborted();
      if (error.status !== 401) throw error;
      if (access === sent) {
        access = "";
        await refresh();
      } else if (!access) {
        await refresh();
      }
      return protectedRequest(access);
    }
  }

  return {
    startPhone(body) {
      return authRequest("/auth/phone/start", body);
    },
    async verifyPhone(id, code) {
      return locked(async () => {
        const data = await authRequest("/auth/phone/verify", { id, code });
        if (!data?.token || !data.user?.uid) throw new Error("Вход не подтверждён сервером.");
        access = data.token;
        return data.user;
      });
    },
    async login(email, password) {
      return locked(async () => {
        const data = await authRequest("/auth/login", { email, password });
        access = data.token;
        return data.user;
      });
    },
    request(path, method, body) {
      return requestWithOptions(path, { method, body });
    },
    requestWithOptions,
    async logout() {
      return locked(async () => {
        await authRequest("/auth/logout");
        access = "";
      });
    },
  };
}

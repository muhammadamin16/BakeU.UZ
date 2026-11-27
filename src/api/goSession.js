export function createGoSession(base, { fetchImpl = globalThis.fetch, locks = globalThis.navigator?.locks, browserSession = true } = {}) {
  let access = "";
  let pending;
  const listeners = new Set();
  const notify = (user) => listeners.forEach((listener) => listener(user));
  const sessionMode = { "X-BakeU-Session": "browser" };
  const locked = (action) =>
    locks?.request("bakeu-go-session", action) ?? action();

  async function call(path, { method = "GET", body, headers, signal, credentials = "omit", responseType } = {}) {
    const multipart = body instanceof FormData;
    const timeout = AbortSignal.timeout(15000);
    const response = await fetchImpl(base + path, {
      method, credentials, redirect: "error",
      headers: { ...(body !== undefined && !multipart && { "Content-Type": "application/json" }), ...headers },
      body: body === undefined || multipart ? body : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.ok && responseType === "blob") return response.blob();
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok || (data === null && response.status !== 204)) {
      const error = new Error(data?.error || `Ошибка API (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function authRequest(path, body) {
    return call(path, { method: "POST", body, headers: browserSession ? sessionMode : undefined, credentials: browserSession ? "include" : "omit" });
  }

  function refresh() {
    if (!browserSession) return Promise.reject(Object.assign(new Error("Войдите в аккаунт BakeU."), { status: 401 }));
    if (!pending) {
      pending = locked(async () => {
        const data = await authRequest("/auth/refresh");
        access = data.token;
      }).finally(() => { pending = undefined; });
    }
    return pending;
  }

  async function requestWithOptions(path, { method, body, headers, signal, responseType } = {}) {
    signal?.throwIfAborted();
    if (!access) await refresh();
    const sent = access;
    const protectedRequest = (token) =>
      call(path, { method, body, signal, responseType, headers: { ...headers, Authorization: `Bearer ${token}` } });
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
    async socketToken() { await refresh(); return access; },
    async exchangeTelegram(ticket) {
      return locked(async () => {
        access = "";
        const data = await authRequest("/auth/phone/telegram", { ticket });
        if (!data?.token || !data.user?.uid) throw new Error("Вход не подтверждён сервером.");
        access = data.token;
        notify(data.user);
        return data.user;
      });
    },
    startPhone(body) {
      return authRequest("/auth/phone/start", body);
    },
    async verifyPhone(id, code) {
      return locked(async () => {
        const data = await authRequest("/auth/phone/verify", { id, code });
        if (!data?.token || !data.user?.uid) throw new Error("Вход не подтверждён сервером.");
        access = data.token;
        notify(data.user);
        return data.user;
      });
    },
    async login(email, password, role) {
      return locked(async () => {
        const data = await authRequest("/auth/login", { email, password });
        if (role && data.user?.role !== role) {
          throw new Error(role === "customer" ? "Войдите с данными аккаунта покупателя." : "Войдите с данными аккаунта продавца.");
        }
        access = data.token;
        notify(data.user);
        return data.user;
      });
    },
    async signup(profile) {
      return locked(async () => {
        const data = await authRequest("/auth/signup", profile);
        access = data.token;
        notify(data.user);
        return data.user;
      });
    },
    request(path, method, body) {
      return requestWithOptions(path, { method, body });
    },
    requestWithOptions,
    subscribeAccount(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async logout() {
      return locked(async () => {
        try { if (browserSession) await authRequest("/auth/logout"); }
        finally { access = ""; notify(null); }
      });
    },
  };
}

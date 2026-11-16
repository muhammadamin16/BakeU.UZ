import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: Welcome } = await vite.ssrLoadModule(
    "/src/miniapp/pages/Welcome.jsx",
  );
  const { default: Gate } = await vite.ssrLoadModule(
    "/src/miniapp/components/AdminGate.jsx",
  );
  const { MiniAppContext } = await vite.ssrLoadModule(
    "/src/miniapp/context.js",
  );
  const render = (component, state, path = "/admin") =>
    renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          MiniAppContext.Provider,
          {
            value: {
              status: "guest",
              user: null,
              isAdmin: false,
              links: {},
              retry: async () => {},
              ...state,
            },
          },
          component,
        ),
      ),
    );
  const guest = render(React.createElement(Welcome), {});
  assert.ok(guest.includes("Войти в магазин"));
  assert.ok(guest.includes("/images/logo-bear.png"));
  assert.ok(guest.includes("/images/winter/bear-gift.png"));
  assert.ok(!guest.includes("mini-admin-entry"));
  const admin = render(React.createElement(Welcome), {
    status: "ready",
    isAdmin: true,
    user: { firstName: "Admin" },
  });
  assert.ok(admin.includes("mini-admin-entry"));
  assert.ok(admin.includes("/admin/telegram"));
  const child = React.createElement("p", null, "SECRET_ADMIN");
  assert.ok(
    !render(React.createElement(Gate, null, child), {}).includes(
      "SECRET_ADMIN",
    ),
  );
  assert.ok(
    !render(React.createElement(Gate, null, child), {
      status: "ready",
      isAdmin: false,
    }).includes("SECRET_ADMIN"),
  );
  assert.ok(
    render(React.createElement(Gate, null, child), {
      status: "ready",
      isAdmin: true,
    }).includes("SECRET_ADMIN"),
  );
  const preview = () =>
    React.createElement(Gate, { allowDemoPreview: true }, child);
  assert.ok(render(preview(), {}).includes("SECRET_ADMIN"));
  assert.ok(!render(preview(), {}, "/admin/telegram").includes("SECRET_ADMIN"));
  assert.ok(
    !render(React.createElement(Gate, null, child), {}).includes(
      "SECRET_ADMIN",
    ),
  );
  assert.ok(!render(preview(), { isMiniMode: true }).includes("SECRET_ADMIN"));
  assert.ok(
    !render(React.createElement(Gate, null, child), {}).includes(
      "Проверить снова",
    ),
  );
  assert.ok(
    render(React.createElement(Gate, null, child), {
      status: "ready",
      isAdmin: false,
    }).includes("Нет прав администратора"),
  );
  assert.ok(
    render(React.createElement(Gate, null, child), {
      status: "error",
      error: "Test API unavailable",
    }).includes("Проверить снова"),
  );
  const { miniLaunch } = await vite.ssrLoadModule("/src/miniapp/telegram.js");
  const originalFetch = globalThis.fetch;
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  const cached = new Map([["bakeu-miniapp-session-v1", "old-admin-session"]]);
  const calls = [];
  try {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key) => cached.get(key) || null,
        setItem: (key, value) => cached.set(key, value),
        removeItem: (key) => cached.delete(key),
      },
    });
    miniLaunch.initData = "new-signed-launch-for-buyer";
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          token: "new-buyer-session",
          user: { id: "999", firstName: "Buyer" },
          isAdmin: false,
          links: {},
          expiresAt: Date.now() + 60000,
        }),
      };
    };
    const api = await vite.ssrLoadModule("/src/miniapp/api.js");
    const session = await api.authenticateMiniApp();
    assert.equal(session.isAdmin, false);
    assert.ok(calls[0].url.endsWith("/miniapp/session"));
    assert.equal(calls[0].options.method, "POST");
    assert.ok(!calls[0].options.headers.Authorization);
    assert.equal(cached.get("bakeu-miniapp-session-v1"), "new-buyer-session");
  } finally {
    globalThis.fetch = originalFetch;
    miniLaunch.initData = "";
    if (storageDescriptor)
      Object.defineProperty(globalThis, "sessionStorage", storageDescriptor);
    else delete globalThis.sessionStorage;
  }
  console.log(
    "PASS: welcome logo, winter artwork, store CTA, verified admin visibility and guest/buyer access denial, account-switch session isolation, public browser demo preview and protected server routes.",
  );
} finally {
  await vite.close();
}

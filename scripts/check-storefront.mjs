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
  const { default: Home } = await vite.ssrLoadModule(
    "/src/pages/Home/Home.jsx",
  );
  const { default: Login } = await vite.ssrLoadModule(
    "/src/pages/Auth/Login/Login.jsx",
  );
  const { default: Register } = await vite.ssrLoadModule(
    "/src/pages/Auth/Register/Register.jsx",
  );
  const { setLanguage } = await vite.ssrLoadModule("/src/i18n/index.js");
  const render = (Component, props = {}, route = "/") =>
    renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: [route] },
        React.createElement(Component, props),
      ),
    );
  setLanguage("uz");
  const home = render(Home);
  assert.ok(home.includes("Şinam qiş."));
  assert.ok(home.includes("Mazali lahzalar."));
  assert.equal((home.match(/<article class="bu-product"/g) || []).length, 4);
  assert.ok(home.includes("/images/winter/snowman.png"));
  assert.ok(home.includes("/product/cake"));
  assert.ok(home.includes("Sevimlilarga qöşiş: Şokoladli tort"));
  const unavailable = render(Home, { subscriptions: [] });
  assert.equal(
    (unavailable.match(/<article class="bu-product"/g) || []).length,
    0,
  );
  assert.ok(unavailable.includes("Hozirça heç narsa topilmadi"));
  const login = render(Login, {}, "/login?next=%2Fcheckout");
  assert.ok(login.includes("Yana xuş kelibsiz"));
  assert.ok(login.includes("login-email"));
  assert.ok(login.includes("login-password"));
  assert.ok(login.includes("/register?next=%2Fcheckout"));
  const register = render(Register, {}, "/register?next=%2Fcheckout");
  assert.ok(register.includes('role="radiogroup"'));
  assert.ok(register.includes("/login?next=%2Fcheckout"));
  setLanguage("ru");
  assert.ok(render(Home).includes("Уютная зима."));
  assert.ok(render(Login, {}, "/login").includes("С возвращением"));
  assert.ok(render(Register, {}, "/register").includes("Создать аккаунт"));
  console.log(
    "PASS: bilingual winter storefront, subscription eligibility, product links, translated favorite labels, auth forms and preserved checkout return links.",
  );
} finally {
  await vite.close();
}

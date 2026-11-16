import test from "node:test";
import assert from "node:assert/strict";
import uz from "../locales/uz.json" with { type: "json" };
import ru from "../locales/ru.json" with { type: "json" };
import {
  getLanguage,
  getLocale,
  readLanguage,
  setLanguage,
  subscribeLanguage,
  translateText,
} from "./index.js";

test("both languages cover interface text with nonempty translations", () => {
  for (const key of Object.keys(ru)) assert.ok(Object.hasOwn(uz, key), key);
  for (const key of Object.keys(uz))
    assert.equal(translateText(key, "ru"), ru[key] ?? key);
  assert.ok(Object.keys(uz).length > 1000);
  for (const [source, target] of Object.entries(uz)) {
    assert.ok(target.trim(), source);
    assert.ok(!/[А-Яа-яЁё]/.test(target) || source === "Русский", source);
  }
});
test("language changes translate full phrases and dynamic counts without changing React nodes", () => {
  setLanguage("uz");
  assert.equal(translateText("По-домашнему."), "Uydagidek.");
  assert.equal(
    translateText("Добавлено в корзину: Шоколадный торт"),
    "Savatga qöşildi: Şokoladli tort",
  );
  assert.equal(
    translateText("Корзина, товаров: 12"),
    "Savatdagi mahsulotlar: 12",
  );
  assert.equal(translateText("180 000 сум"), "180 000 söm");
  assert.deepEqual(translateText(["Торты", 2, null]), ["Tortlar", 2, null]);
  const element = { type: "strong", props: { children: "Торты" } };
  assert.equal(translateText(element), element);
  assert.equal(translateText("A user's own message"), "A user's own message");
  assert.equal(getLocale(), "uz-UZ");
  setLanguage("ru");
  assert.equal(translateText("По-домашнему."), "По-домашнему.");
  assert.equal(translateText("Magazinga kirish"), "Войти в магазин");
  assert.equal(getLocale(), "ru-RU");
});
test("stored languages are validated, with a fallback for unavailable storage", () => {
  assert.equal(readLanguage({ getItem: () => "uz" }), "uz");
  assert.equal(readLanguage({ getItem: () => "invalid" }), "ru");
  assert.equal(
    readLanguage({
      getItem: () => {
        throw Error("denied");
      },
    }),
    "ru",
  );
  assert.equal(readLanguage(null), "ru");
});
test("subscribers update once per valid change, even when persistence is unavailable", () => {
  setLanguage("ru");
  let calls = 0;
  const stop = subscribeLanguage(() => calls++);
  setLanguage("uz");
  setLanguage("uz");
  setLanguage("unsupported");
  assert.equal(getLanguage(), "uz");
  assert.equal(calls, 1);
  stop();
  setLanguage("ru");
  assert.equal(calls, 1);
});

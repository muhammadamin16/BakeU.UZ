import test from "node:test";
import assert from "node:assert/strict";
import { toUzbekAlphabet, normalizeSearch } from "./alphabet.js";
import { translateText } from "./index.js";
import uz from "../locales/uz.json" with { type: "json" };

test("all four requested letter changes preserve case and apostrophe variants", () => {
  assert.equal(toUzbekAlphabet("ch Ch CH sh Sh SH"), "ç Ç Ç ş Ş Ş");
  assert.equal(toUzbekAlphabet("g' G‘ gʻ Gʼ o' O‘ oʻ Oʼ"), "ğ Ğ ğ Ğ ö Ö ö Ö");
  assert.equal(
    toUzbekAlphabet("O‘zbekcha: shokoladli, o‘zgacha, g‘oya."),
    "Özbekça: şokoladli, özgaça, ğoya.",
  );
  assert.equal(toUzbekAlphabet("ta’m, san’at"), "ta’m, san’at");
});
test("technical addresses, code and brand names survive spelling conversion", () => {
  const technical =
    "https://shop.example/choy o.gul@example.com /images/shop/photo.jpg `shopId` Chrome WhatsApp GitHub";
  assert.equal(toUzbekAlphabet(technical), technical);
});
test("translations consistently use the requested alphabet and conversion is idempotent", () => {
  for (const [key, value] of Object.entries(uz))
    assert.equal(toUzbekAlphabet(value), value, key);
  assert.equal(
    translateText("Добавлено в корзину: Шоколадный торт", "uz"),
    "Savatga qöşildi: Şokoladli tort",
  );
  assert.equal(translateText("Magazinga kirish", "uz"), "Dökonga kiriş");
  assert.equal(translateText("O‘zbekcha", "uz"), "Özbekça");
  assert.equal(translateText("Шоколадный торт", "ru"), "Шоколадный торт");
});
test("search accepts both old and new spellings without altering input", () => {
  for (const [oldSpelling, newSpelling] of [
    ["SHOKOLADLI", "Şokoladli"],
    ["pechenye", "peçenye"],
    ["o‘zgacha", "özgaça"],
    ["g'oya", "ğoya"],
  ]) {
    assert.equal(normalizeSearch(oldSpelling), normalizeSearch(newSpelling));
  }
  assert.equal(normalizeSearch("  Торты  "), "торты");
});

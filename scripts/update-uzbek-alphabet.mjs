import { readFile, writeFile } from "node:fs/promises";
import { toUzbekAlphabet } from "../src/i18n/alphabet.js";

const file = new URL("../src/locales/uz.json", import.meta.url);
const translations = JSON.parse(await readFile(file, "utf8"));
for (const key of Object.keys(translations)) {
  translations[key] = toUzbekAlphabet(translations[key]);
}
await writeFile(file, JSON.stringify(translations, null, 2) + "\n");
console.log(
  "Updated Uzbek display values; translation keys and stored data are unchanged.",
);

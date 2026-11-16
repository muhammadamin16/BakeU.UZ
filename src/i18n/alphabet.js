// The four spelling changes requested for BakeU's Uzbek interface.
// Apply only to authored translations, never to user content or stored identifiers.
const protectedText =
  /https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.\w+|\/(?:[\w.-]+\/)+[\w./-]*|`[^`]*`|\b(?:Chrome|JavaScript|WhatsApp|GitHub|Photoshop)\b/g;
const apostrophe = "['’‘ʻʼ`´ʹ]";
const letterPairs = new RegExp(`[oOgG]${apostrophe}|[cC][hH]|[sS][hH]`, "g");
const letters = {
  o: "ö",
  O: "Ö",
  g: "ğ",
  G: "Ğ",
  c: "ç",
  C: "Ç",
  s: "ş",
  S: "Ş",
};

export function toUzbekAlphabet(text) {
  let result = "",
    offset = 0;
  for (const match of text.matchAll(protectedText)) {
    result += text
      .slice(offset, match.index)
      .replace(letterPairs, (pair) => letters[pair[0]]);
    result += match[0];
    offset = match.index + match[0].length;
  }
  return (
    result + text.slice(offset).replace(letterPairs, (pair) => letters[pair[0]])
  );
}

// Accept both keyboard spellings in search, without changing saved data.
export function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(
      /[çşğö]/g,
      (letter) => ({ ç: "ch", ş: "sh", ğ: "g", ö: "o" })[letter],
    )
    .replace(/['’‘ʻʼ`´ʹ]/g, "")
    .trim();
}

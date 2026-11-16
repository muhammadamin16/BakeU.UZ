import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: BackgroundMusic } = await vite.ssrLoadModule(
    "/src/components/BackgroundMusic/BackgroundMusic.jsx",
  );
  const { setLanguage } = await vite.ssrLoadModule("/src/i18n/index.js");
  setLanguage("uz");
  const markup = renderToString(React.createElement(BackgroundMusic));
  const source = markup.match(/<audio[^>]*src="([^"]+)"/)?.[1];
  assert.ok(
    source?.startsWith("/music/"),
    "Player must reference a bundled audio asset",
  );
  const bytes = await readFile(new URL(`../public${source}`, import.meta.url));
  assert.ok(bytes.length > 1024, "The referenced audio must not be empty");
  assert.ok(
    bytes.subarray(0, 3).toString() === "ID3" ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
    "The audio asset must contain MP3 data, not SPA HTML",
  );
  assert.ok(!/<audio[^>]*autoplay/i.test(markup));
  assert.ok(/<audio[^>]*preload="none"/.test(markup));
  assert.ok(markup.includes('aria-pressed="false"'));
  assert.ok(markup.includes('aria-label="Musiqani yoqiş"'));
  setLanguage("ru");
  assert.ok(
    renderToString(React.createElement(BackgroundMusic)).includes(
      "Включить музыку",
    ),
  );
  console.log(
    "PASS: the player references a real bundled MP3, starts without autoplay, and has localized accessible controls.",
  );
} finally {
  await vite.close();
}

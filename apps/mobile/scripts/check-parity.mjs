import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { migrationManifest } from "./migration-manifest.mjs";
const website = fileURLToPath(new URL("../../../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "bakeu-parity-"));
try {
  await build({
    root: website,
    configFile: path.join(website, "vite.config.js"),
    plugins: [migrationManifest(website)],
    build: { outDir: temporary, emptyOutDir: true },
    logLevel: "warn",
  });
  const web = JSON.parse(
    await readFile(path.join(temporary, "migration-manifest.json"), "utf8"),
  );
  const app = JSON.parse(
    await readFile(
      new URL("../dist/migration-manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const byPath = new Map(
    app.sourceFiles.map((file) => [file.path, file.sha256]),
  );
  for (const file of web.sourceFiles)
    assert.equal(
      byPath.get(file.path),
      file.sha256,
      `Website module missing or changed in app: ${file.path}`,
    );
  assert.deepEqual(app.publicAssets, web.publicAssets);
  assert.ok(
    !app.sourceFiles.some(
      (file) =>
        file.path.startsWith("src/bot/") &&
        !file.path.startsWith("src/bot/client/"),
    ),
    "Server-only code must never enter the mobile bundle",
  );
  console.log(
    `PASS: every one of ${web.sourceFiles.length} website modules and ${web.publicAssets.length} public assets matches the app by SHA-256; no server-only modules bundled.`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}

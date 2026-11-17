import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
const hash = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
export function publicAssets(root, relative = "") {
  const files = [];
  for (const entry of readdirSync(path.join(root, relative), {
    withFileTypes: true,
  })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...publicAssets(root, name));
    else if (entry.isFile())
      files.push({
        path: name.split(path.sep).join("/"),
        sha256: hash(path.join(root, name)),
      });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
export function migrationManifest(website) {
  return {
    name: "bakeu-source-parity",
    apply: "build",
    generateBundle() {
      const files = [...this.getModuleIds()]
        .map((id) => id.split("?")[0])
        .filter((id) => id.startsWith(path.join(website, "src") + path.sep));
      const sourceFiles = [...new Set(files)]
        .sort()
        .map((file) => ({
          path: path.relative(website, file).split(path.sep).join("/"),
          sha256: hash(file),
        }));
      const license = path.join(website, "apps/mobile/NOTICE-Inter.txt");
      this.emitFile({
        type: "asset",
        fileName: "Inter-OFL.txt",
        source: readFileSync(license, "utf8"),
      });
      this.emitFile({
        type: "asset",
        fileName: "migration-manifest.json",
        source:
          JSON.stringify(
            {
              sharedEntry: "src/main.jsx",
              sourceFiles,
              publicAssets: publicAssets(path.join(website, "public")),
            },
            null,
            2,
          ) + "\n",
      });
    },
  };
}

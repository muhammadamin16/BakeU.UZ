import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const app = fileURLToPath(new URL("../", import.meta.url));
const directory = await mkdtemp(path.join(app, ".native-brand-"));
try {
  await copyFile(
    new URL("../../../public/images/logo-bear.png", import.meta.url),
    path.join(directory, "logo.png"),
  );
  execFileSync(
    path.join(app, "node_modules/.bin/capacitor-assets"),
    [
      "generate",
      "--assetPath",
      path.relative(app, directory),
      "--ios",
      "--android",
      "--iconBackgroundColor",
      "#f7e4e4",
      "--iconBackgroundColorDark",
      "#f7e4e4",
      "--splashBackgroundColor",
      "#f7e4e4",
      "--splashBackgroundColorDark",
      "#f7e4e4",
    ],
    { cwd: app, stdio: "inherit" },
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}

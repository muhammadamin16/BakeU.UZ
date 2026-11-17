import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const app = fileURLToPath(new URL("../", import.meta.url));
const website = fileURLToPath(new URL("../../../", import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(app, "dist/migration-manifest.json"), "utf8"),
);
const hash = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
for (const asset of manifest.publicAssets)
  assert.equal(
    hash(path.join(app, "dist", asset.path)),
    asset.sha256,
    asset.path,
  );
for (const source of manifest.sourceFiles)
  assert.equal(
    hash(path.join(website, source.path)),
    source.sha256,
    source.path,
  );
for (const page of [
  "src/pages/Home/Home.jsx",
  "src/pages/Auth/Login/Login.jsx",
  "src/pages/Auth/Register/Register.jsx",
  "src/pages/Cart/Cart.jsx",
  "src/pages/Checkout/Checkout.jsx",
  "src/pages/Product/Product.jsx",
  "src/pages/Profile/Profile.jsx",
  "src/pages/Map/Map.jsx",
  "src/pages/AiAssistant/AiAssistant.jsx",
  "src/pages/Messages/Chat.jsx",
  "src/pages/Orders/Orders.jsx",
  "src/admin/routes/AdminRoutes.jsx",
  "src/miniapp/pages/ServerAdmin.jsx",
])
  assert.ok(
    manifest.sourceFiles.some((file) => file.path === page),
    `Missing bundled page: ${page}`,
  );
assert.ok(
  manifest.publicAssets.some(
    (asset) => asset.path === "images/winter/background.png",
  ),
);
assert.ok(
  manifest.publicAssets.some(
    (asset) => asset.path === "images/winter/snowman.png",
  ),
);
assert.ok(manifest.publicAssets.some((asset) => asset.path.endsWith(".mp3")));
console.log(
  `PASS: ${manifest.sourceFiles.length} shared modules and ${manifest.publicAssets.length} identical public assets; storefront, accounts, orders and complete admin routes are bundled.`,
);

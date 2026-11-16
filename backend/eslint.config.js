const js = require("@eslint/js");
const { defineConfig, globalIgnores } = require("eslint/config");
const globals = require("globals");
const tseslint = require("typescript-eslint");
module.exports = defineConfig([
  globalIgnores(["dist/**", "node_modules/**"]),
  {
    files: ["**/*.{ts,cjs,js}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  { files: ["**/*.ts"], extends: [tseslint.configs.recommended] },
]);

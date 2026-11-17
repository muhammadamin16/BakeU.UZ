import js from "@eslint/js";
import globals from "globals";
export default [
  { ignores: ["dist/**", "android/**", "ios/**", "node_modules/**"] },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];

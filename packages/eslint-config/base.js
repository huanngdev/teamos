import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export const baseConfig = [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.es2022,
      },
    },
    rules: {
      "no-console": "warn",
    },
  },
];

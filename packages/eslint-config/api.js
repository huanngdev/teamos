import globals from "globals";

import { baseConfig } from "./base.js";

const apiConfig = [
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        Bun: "readonly",
        ...globals.es2022,
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];

export default apiConfig;

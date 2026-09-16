import { plugin as shadcn } from "@shadcn/lint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

import { baseConfig } from "./base.js";

const webConfig = [
  ...baseConfig,
  {
    files: ["**/*.{jsx,tsx}"],
    settings: {
      shadcn: {
        ui: "@/components/ui",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      shadcn,
    },
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "shadcn/no-arbitrary-values": "error",
      "shadcn/no-inline-styles": "error",
      "shadcn/no-raw-colors": "error",
      "shadcn/no-restyle": ["error", { allow: ["layout"] }],
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
    },
  },
  {
    files: ["**/components/ui/**/*.{jsx,tsx}"],
    rules: {
      "shadcn/no-arbitrary-values": "off",
      "shadcn/no-restyle": "off",
      "shadcn/require-static-classes": "off",
      "react-refresh/only-export-components": "off",
    },
  },
];

export default webConfig;

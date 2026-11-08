import path from "node:path";
import { fileURLToPath } from "node:url";

import vitestBaseConfig from "@teamos/config/vitest/base";
import { defineConfig, mergeConfig } from "vitest/config";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(sourceDirectory, "./src"),
      },
    },
  }),
);

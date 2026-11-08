import vitestBaseConfig from "@teamos/config/vitest/base";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(vitestBaseConfig, defineConfig({}));

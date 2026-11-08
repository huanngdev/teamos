import { defineConfig } from "tsdown";

export default defineConfig({
  // Watch rebuilds must not remove dist while apps are booting against it.
  clean: false,
  dts: true,
  entry: ["src/index.ts", "src/schema/index.ts"],
  exports: true,
});

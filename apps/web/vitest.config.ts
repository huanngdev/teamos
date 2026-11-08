/*
 * apps/web tests run on Node (`vitest run`, not `bun --bun`): the jsdom
 * browser code needs no Bun APIs, and MSW's node interceptors rely on
 * `tls.TLSSocket` internals that Bun does not implement.
 */
import vitestBaseConfig from "@teamos/config/vitest/base";
import { loadEnv } from "vite";
import { defineConfig, mergeConfig } from "vitest/config";

import { envSchema } from "./env.schema.ts";
import viteConfig from "./vite.config.ts";

export default defineConfig((configEnv) => {
  // vite.config.ts already rejects an invalid env, so this parse cannot fail.
  const apiUrl = envSchema.parse(loadEnv(configEnv.mode, ".", "")).VITE_API_URL;

  return mergeConfig(
    mergeConfig(viteConfig(configEnv), vitestBaseConfig),
    defineConfig({
      test: {
        environment: "jsdom",
        /*
         * Serve the test document from the API origin. MSW 3 mocks XHR through
         * jsdom's CORS checks, and the mocked handlers do not emulate the API's
         * CORS headers, so cross-origin credentialed requests would fail.
         */
        environmentOptions: {
          jsdom: { url: new URL(apiUrl).origin },
        },
        setupFiles: ["./test/support/setup.ts"],
        testTimeout: 15_000,
      },
    }),
  );
});

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { envSchema } from "./env.schema";

export default defineConfig(({ mode }) => {
  const parsed = envSchema.safeParse(loadEnv(mode, ".", ""));

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment variables in apps/web/.env:\n${issues}`);
  }

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(parsed.data.VITE_API_URL),
    },
    preview: {
      host: "0.0.0.0",
      port: 4000,
      strictPort: true,
    },
    server: {
      host: "0.0.0.0",
      port: 4000,
      strictPort: true,
    },
  };
});

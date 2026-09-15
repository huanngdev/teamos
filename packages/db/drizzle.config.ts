import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://teamos:teamos@localhost:5432/teamos",
  },
  out: "./drizzle",
  schema: "./src/schema/index.ts",
});

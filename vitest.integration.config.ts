import { defineConfig } from "vitest/config";
import path from "path";

// Load .env.local manually — vitest only loads .env / .env.test by default
import { config } from "dotenv";
config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Single thread + sequential files = one sign-in for the whole suite
    pool: "threads",
    fileParallelism: false,
    maxConcurrency: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

import { defineConfig } from "vitest/config";
import path from "path";

// Route ASSET_TEST_DB_URL → ASSET_DB_URL so PrismaClient connects to the test DB
if (process.env.ASSET_TEST_DB_URL) {
  process.env.ASSET_DB_URL = process.env.ASSET_TEST_DB_URL;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globals: false,
    // All test files share a single PostgreSQL database, so parallel file
    // execution would cause FK constraint violations during nukeTestData
    // cleanup (one file deletes asset types while another still has assets
    // referencing them). Disable parallelism to run files sequentially.
    fileParallelism: false,
    include: ["__tests__/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
    ],
  },
});

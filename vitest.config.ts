import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "server/__tests__/**/*.test.mjs",
      "lib/i18n/**/*.test.ts",
      "lib/market-engine/**/*.test.ts",
      "lib/product-engine/**/*.test.ts",
      "lib/supplier-engine/**/*.test.ts",
      "lib/pricing-engine/**/*.test.ts",
      "lib/inventory-engine/**/*.test.ts",
      "lib/order-engine/**/*.test.ts",
      "lib/marketplace-engine/**/*.test.ts",
      "lib/returns-engine/**/*.test.ts",
      "lib/ai-orchestrator/**/*.test.ts",
      "lib/ai-workers/**/*.test.ts",
    ],
    globals: false,
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

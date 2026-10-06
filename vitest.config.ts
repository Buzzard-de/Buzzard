import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "server/__tests__/**/*.test.mjs",
      "lib/backgrounds/**/*.test.ts",
      "lib/market/languageIndependence.test.ts",
      "lib/market/resolveInitialCountry.test.ts",
      "lib/i18n/catalog.test.ts",
      "lib/categories/i18n.test.ts",
      "lib/mobile/isolation.test.ts",
      "lib/mobile/categoryFilters.test.ts",
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

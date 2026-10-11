import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "server/__tests__/**/*.test.mjs",
      "!server/__tests__/part24*.test.mjs",
      "!server/__tests__/part27*.test.mjs",
      "!server/__tests__/part28*.test.mjs",
      "!server/__tests__/part29*.test.mjs",
      "!server/__tests__/part30*.test.mjs",
      "!server/__tests__/part31*.test.mjs",
      "!server/__tests__/part32*.test.mjs",
      "!server/__tests__/part33*.test.mjs",
      "!server/__tests__/part34*.test.mjs",
      "!server/__tests__/part35*.test.mjs",
      "lib/backgrounds/**/*.test.ts",
      "lib/market/languageIndependence.test.ts",
      "lib/market/resolveInitialCountry.test.ts",
      "lib/i18n/catalog.test.ts",
      "lib/i18n/localeCatalog.test.ts",
      "lib/i18n/localeMarketRtl.test.ts",
      "lib/i18n/localeCompletion.test.ts",
      "lib/i18n/localeFinalization.test.ts",
      "lib/i18n/international/international.test.ts",
      "lib/market-engine/marketEngine.test.ts",
      "lib/categories/i18n.test.ts",
      "lib/home/homepage.test.ts",
      "lib/mobile/isolation.test.ts",
      "lib/mobile/categoryFilters.test.ts",
      "lib/mobile/visuals.test.ts",
    ],
    globals: false,
    testTimeout: 15000,
    env: {
      BUZZARD_SALES_GATE_BYPASS: "1",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

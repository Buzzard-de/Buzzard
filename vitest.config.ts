import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: [
      "server/__tests__/**/*.test.mjs",
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
      "lib/storefront/mergePolicy.test.ts",
      "lib/nextDistIsolation.test.ts",
      "lib/admin/apiBase.test.ts",
      "lib/home/homepage.test.ts",
      "lib/mobile/isolation.test.ts",
      "lib/mobile/categoryFilters.test.ts",
      "lib/mobile/visuals.test.ts",
    ],
    exclude: [
      "server/__tests__/part24ProductionReleaseReadiness.test.mjs",
      "server/__tests__/part27OperationalFinalization.test.mjs",
      "server/__tests__/part28FinalGoLiveReadiness.test.mjs",
      "server/__tests__/part29FinalPreLaunchAudit.test.mjs",
      "server/__tests__/part30FinalOperationalReadiness.test.mjs",
      "server/__tests__/part31FinalLaunchGovernance.test.mjs",
      "server/__tests__/part32FinalControlRecovery.test.mjs",
      "server/__tests__/part33FinalPreLaunchControl.test.mjs",
      "server/__tests__/part34FinalLaunchControl.test.mjs",
      "server/__tests__/part35FinalProductionGovernance.test.mjs",
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

import { configureAnalyticsStore, getAnalyticsPersistenceMode } from "./configure";
import { createMemoryAnalyticsStore } from "./memoryStore";

let bootstrapped = false;

export function bootstrapAnalyticsPersistence(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  const explicitMode = process.env.BUZZARD_ANALYTICS_PERSISTENCE?.trim().toLowerCase();
  if (explicitMode === "memory") {
    configureAnalyticsStore(createMemoryAnalyticsStore(), "memory");
    return;
  }

  if (process.env.BUZZARD_DB_ENABLED === "0") {
    configureAnalyticsStore(createMemoryAnalyticsStore(), "memory");
    return;
  }

  try {
    // Bundled server runtime resolves this path via esbuild server/lib plugin.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPersistentAnalyticsStore } = require("server/lib/analytics/persistentStore.js");
    configureAnalyticsStore(createPersistentAnalyticsStore(), "sqlite");
  } catch {
    configureAnalyticsStore(createMemoryAnalyticsStore(), "memory");
  }
}

export function isAnalyticsPersistenceBootstrapped(): boolean {
  return bootstrapped;
}

export { getAnalyticsPersistenceMode };

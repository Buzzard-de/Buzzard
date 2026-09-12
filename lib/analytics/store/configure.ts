import type { AnalyticsStore, AnalyticsPersistenceMode } from "./types";
import { createMemoryAnalyticsStore } from "./memoryStore";

let activeStore: AnalyticsStore = createMemoryAnalyticsStore();
let persistenceMode: AnalyticsPersistenceMode = "memory";

export function configureAnalyticsStore(store: AnalyticsStore, mode: AnalyticsPersistenceMode = "memory"): void {
  activeStore = store;
  persistenceMode = mode;
}

export function getAnalyticsStore(): AnalyticsStore {
  return activeStore;
}

export function getAnalyticsPersistenceMode(): AnalyticsPersistenceMode {
  return persistenceMode;
}

export function resetAnalyticsStoreToMemory(): void {
  activeStore = createMemoryAnalyticsStore();
  persistenceMode = "memory";
}

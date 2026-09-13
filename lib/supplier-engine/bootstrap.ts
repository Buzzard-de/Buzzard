import { hydrateRuntimeStateFromPersistence } from "./state";
import { hydrateSyncCursorsFromPersistence } from "./syncCursor";
import { hydrateHealthFromPersistence } from "./health";
import { hydrateRegistryFromPersistence } from "./registry";

let bootstrapped = false;

export function bootstrapSupplierEnginePersistence(): void {
  if (bootstrapped) return;
  hydrateRegistryFromPersistence();
  hydrateRuntimeStateFromPersistence();
  hydrateSyncCursorsFromPersistence();
  hydrateHealthFromPersistence();
  bootstrapped = true;
}

export function resetSupplierEngineBootstrap(): void {
  bootstrapped = false;
}

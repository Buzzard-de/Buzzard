import { hydrateRuntimeStateFromPersistence } from "./state";
import { hydrateSyncCursorsFromPersistence } from "./syncCursor";
import { hydrateHealthFromPersistence } from "./health";
import { hydrateRegistryFromPersistence } from "./registry";
import { hydrateSupplierOrderSandboxFromPersistence } from "./orderSandbox/persistence";

let bootstrapped = false;

export function bootstrapSupplierEnginePersistence(): void {
  if (bootstrapped) return;
  hydrateRegistryFromPersistence();
  hydrateRuntimeStateFromPersistence();
  hydrateSyncCursorsFromPersistence();
  hydrateHealthFromPersistence();
  bootstrapped = true;
  hydrateSupplierOrderSandboxFromPersistence();
}

export function resetSupplierEngineBootstrap(): void {
  bootstrapped = false;
}

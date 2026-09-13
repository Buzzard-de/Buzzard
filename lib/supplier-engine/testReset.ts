import { TEST_SUPPLIER_ID } from "./fixtures";
import { resetSupplierEngineBootstrap } from "./bootstrap";
import { resetSupplierRuntimeState } from "./state";
import { resetSyncCursors } from "./syncCursor";
import { resetRateLimit } from "./rateLimit";
import { clearObservability } from "./observability";
import { resetSupplierPersistenceCache } from "./persistence";
import { resetOrderIdempotencyKeys } from "./orderIdempotency";
import { resetCredentialRefs } from "./credentials";

function resetPersistentOperationalState(supplierId: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPersistentSupplierStore } = require("../../server/lib/supplier/persistentStore.js");
    createPersistentSupplierStore()?.resetOperationalState(supplierId);
  } catch {
    /* persistence unavailable in some test contexts */
  }
}

/** Resets cross-test supplier engine state for deterministic vitest runs. */
export function resetSupplierEngineForTests(supplierId: string = TEST_SUPPLIER_ID): void {
  resetSupplierEngineBootstrap();
  resetSupplierPersistenceCache();
  resetPersistentOperationalState(supplierId);
  resetSupplierRuntimeState();
  resetSyncCursors();
  resetRateLimit(supplierId);
  resetOrderIdempotencyKeys();
  resetCredentialRefs();
  clearObservability();
}

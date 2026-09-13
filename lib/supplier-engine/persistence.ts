/* eslint-disable @typescript-eslint/no-explicit-any */
/** Optional SQLite persistence bridge — loaded at runtime in Node bundle. */

export interface PersistentSupplierStore {
  getMode(): string;
  listRegistryRows(): Array<Record<string, unknown>>;
  getRegistryRow(supplierId: string): Record<string, unknown> | undefined;
  saveRegistryRow(row: Record<string, unknown>): Record<string, unknown> | undefined;
  getRuntimeState(supplierId: string): Record<string, unknown> | undefined;
  saveRuntimeState(state: Record<string, unknown>): Record<string, unknown> | undefined;
  tryAcquireSyncLock(supplierId: string, jobId: string): { acquired: boolean; ownerJobId?: string };
  releaseSyncLock(supplierId: string, jobId: string): boolean;
  getCursor(supplierId: string, syncMode?: string): Record<string, unknown> | undefined;
  saveCursor(cursor: Record<string, unknown>): Record<string, unknown> | undefined;
  clearCursor(supplierId: string, syncMode?: string): void;
  getCursorForAdmin(supplierId: string, syncMode?: string): Record<string, unknown> | null;
  getHealth(supplierId: string): Record<string, unknown> | undefined;
  saveHealth(health: Record<string, unknown>): Record<string, unknown> | undefined;
  claimIdempotencyKey(key: string, supplierId: string): boolean;
  recordAudit(entry: Record<string, unknown>): void;
  listAudit(supplierId: string, limit?: number): Array<Record<string, unknown>>;
  saveOrderSandbox?(row: Record<string, unknown>): void;
  getOrderSandboxByIdempotency?(key: string): Record<string, unknown> | undefined;
  getOrderSandboxByReference?(supplierOrderId: string): Record<string, unknown> | undefined;
  getLastOrderSandboxForSupplier?(supplierId: string): Record<string, unknown> | undefined;
  listOrderSandbox?(supplierId?: string): Array<Record<string, unknown>>;
  resetOrderSandbox?(supplierId?: string): void;
}

let store: PersistentSupplierStore | null | undefined;

export function getSupplierPersistence(): PersistentSupplierStore | null {
  if (store !== undefined) return store;
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_PERSISTENCE === "0") {
    store = null;
    return store;
  }
  const candidates = [
    "server/lib/supplier/persistentStore.js",
    "../../server/lib/supplier/persistentStore.js",
  ];
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(candidate) as {
        createPersistentSupplierStore: () => PersistentSupplierStore;
      };
      store = mod.createPersistentSupplierStore();
      return store;
    } catch {
      /* try next path */
    }
  }
  store = null;
  return store;
}

export function getSupplierPersistenceMode(): "memory" | "sqlite" {
  return getSupplierPersistence()?.getMode() === "sqlite" ? "sqlite" : "memory";
}

export function resetSupplierPersistenceCache(): void {
  store = undefined;
}

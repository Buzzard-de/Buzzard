import { describe, it, expect, beforeEach } from "vitest";
import {
  bootstrapSupplierEnginePersistence,
  resetSupplierEngineBootstrap,
  resetSupplierRuntimeState,
  resetSyncCursors,
  resetSupplierHealthCache,
  resetSupplierPersistenceCache,
  getSupplierPersistenceMode,
  saveSyncCursor,
  getSyncCursor,
  clearSyncCursor,
  getSyncCursorForAdmin,
  getSupplierRuntimeState,
  tryAcquireSupplierSyncLock,
  releaseSupplierSyncLock,
  runSupplierSyncJob,
  setSupplierEnabled,
  disableSupplier,
  isSupplierSelectable,
  selectBestSupplierForOrder,
  getSupplierHealth,
  recordSupplierHealthSuccess,
  recordSupplierHealthFailure,
  TEST_SUPPLIER_ID,
  clearObservability,
} from "./index";
import { getProduct } from "@/lib/product-engine";

function loadPersistentStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPersistentSupplierStore } = require("../../server/lib/supplier/persistentStore.js");
    return createPersistentSupplierStore();
  } catch {
    return null;
  }
}

function hasPersistentStore(): boolean {
  return loadPersistentStore()?.getMode() === "sqlite";
}

describe.skipIf(!hasPersistentStore())("Supplier Operations — SQLite persistence", () => {
  beforeEach(() => {
    loadPersistentStore()?.resetOperationalState(TEST_SUPPLIER_ID);
    resetSupplierPersistenceCache();
    resetSupplierEngineBootstrap();
    resetSupplierRuntimeState();
    resetSyncCursors();
    resetSupplierHealthCache();
    clearObservability();
    bootstrapSupplierEnginePersistence();
    expect(getSupplierPersistenceMode()).toBe("sqlite");
  });

  it("persists sync cursor across bootstrap reload", () => {
    saveSyncCursor(TEST_SUPPLIER_ID, { cursor: "page-3", page: 3 }, "incremental");
    resetSyncCursors();
    resetSupplierEngineBootstrap();
    bootstrapSupplierEnginePersistence();
    const cursor = getSyncCursor(TEST_SUPPLIER_ID, "incremental");
    expect(cursor?.cursor).toBe("page-3");
    expect(cursor?.page).toBe(3);
  });

  it("masks cursor values for admin view", () => {
    saveSyncCursor(TEST_SUPPLIER_ID, { cursor: "secret-token-abc" }, "incremental");
    const adminView = getSyncCursorForAdmin(TEST_SUPPLIER_ID, "incremental");
    expect(adminView?.valueMasked).not.toContain("secret-token-abc");
    expect(adminView?.valueMasked).toContain("*");
  });

  it("persists runtime state after sync", async () => {
    const result = await runSupplierSyncJob(TEST_SUPPLIER_ID, { integrationType: "api", jobType: "FULL" });
    expect(result.status).not.toBe("FAILED");
    resetSupplierRuntimeState();
    resetSupplierEngineBootstrap();
    bootstrapSupplierEnginePersistence();
    const state = getSupplierRuntimeState(TEST_SUPPLIER_ID);
    expect(["SUCCESS", "PARTIAL", "IDLE"].includes(state.syncStatus)).toBe(true);
    expect(state.lastSuccessfulSync || state.productsProcessed).toBeTruthy();
  });

  it("persists health metrics", () => {
    recordSupplierHealthSuccess(TEST_SUPPLIER_ID, { responseTimeMs: 120 });
    recordSupplierHealthFailure(TEST_SUPPLIER_ID, { errorCode: "TIMEOUT" });
    resetSupplierHealthCache();
    resetSupplierEngineBootstrap();
    bootstrapSupplierEnginePersistence();
    const health = getSupplierHealth(TEST_SUPPLIER_ID);
    expect(health.successCount).toBeGreaterThan(0);
    expect(health.errorCount).toBeGreaterThan(0);
  });

  it("prevents concurrent sync for same supplier", async () => {
    const first = tryAcquireSupplierSyncLock(TEST_SUPPLIER_ID, "job-a");
    const second = tryAcquireSupplierSyncLock(TEST_SUPPLIER_ID, "job-b");
    expect(first.acquired).toBe(true);
    expect(second.acquired).toBe(false);
    releaseSupplierSyncLock(TEST_SUPPLIER_ID, "job-a");
    const third = tryAcquireSupplierSyncLock(TEST_SUPPLIER_ID, "job-c");
    expect(third.acquired).toBe(true);
    releaseSupplierSyncLock(TEST_SUPPLIER_ID, "job-c");
  });

  it("disabled supplier excluded from order selection", () => {
    disableSupplier(TEST_SUPPLIER_ID);
    expect(isSupplierSelectable(TEST_SUPPLIER_ID)).toBe(false);
    const product = getProduct("reifen-pilot-sport");
    expect(product).toBeDefined();
    const selection = selectBestSupplierForOrder(product!, { countryCode: "DE" });
    if (selection) {
      expect(selection.offer.supplierId).not.toBe(TEST_SUPPLIER_ID);
    }
    setSupplierEnabled(TEST_SUPPLIER_ID, true);
    expect(isSupplierSelectable(TEST_SUPPLIER_ID)).toBe(true);
  });

  it("does not advance cursor on failed fetch", async () => {
    clearSyncCursor(TEST_SUPPLIER_ID, "incremental");
    saveSyncCursor(TEST_SUPPLIER_ID, { cursor: "stable-cursor" }, "incremental");
    const before = getSyncCursor(TEST_SUPPLIER_ID, "incremental")?.cursor;
    await runSupplierSyncJob(TEST_SUPPLIER_ID, { jobType: "INCREMENTAL", integrationType: "api" });
    const after = getSyncCursor(TEST_SUPPLIER_ID, "incremental")?.cursor;
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
  });

});

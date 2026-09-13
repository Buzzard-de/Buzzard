export interface SupplierSyncCursor {
  supplierId: string;
  cursor?: string;
  page?: number;
  offset?: number;
  lastModified?: string;
  updatedAt: string;
}

const cursorStore = new Map<string, SupplierSyncCursor>();

export function getSyncCursor(supplierId: string): SupplierSyncCursor | undefined {
  return cursorStore.get(supplierId);
}

export function saveSyncCursor(
  supplierId: string,
  patch: Partial<Omit<SupplierSyncCursor, "supplierId" | "updatedAt">>
): SupplierSyncCursor {
  const existing = cursorStore.get(supplierId);
  const next: SupplierSyncCursor = {
    supplierId,
    cursor: patch.cursor ?? existing?.cursor,
    page: patch.page ?? existing?.page,
    offset: patch.offset ?? existing?.offset,
    lastModified: patch.lastModified ?? existing?.lastModified,
    updatedAt: new Date().toISOString(),
  };
  cursorStore.set(supplierId, next);
  return next;
}

export function clearSyncCursor(supplierId: string): void {
  cursorStore.delete(supplierId);
}

export function listSyncCursors(): SupplierSyncCursor[] {
  return [...cursorStore.values()];
}

/** Test-only reset */
export function resetSyncCursors(): void {
  cursorStore.clear();
}

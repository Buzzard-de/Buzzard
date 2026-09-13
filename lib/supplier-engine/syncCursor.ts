import { getSupplierPersistence } from "./persistence";

export type SupplierSyncMode = "full" | "incremental";

export interface SupplierSyncCursor {
  supplierId: string;
  syncMode?: SupplierSyncMode;
  cursor?: string;
  page?: number;
  offset?: number;
  lastModified?: string;
  updatedAt: string;
}

const cursorStore = new Map<string, SupplierSyncCursor>();

function cursorKey(supplierId: string, syncMode: SupplierSyncMode = "incremental"): string {
  return `${supplierId}:${syncMode}`;
}

function fromPersisted(row: Record<string, unknown>): SupplierSyncCursor {
  return {
    supplierId: String(row.supplierId),
    syncMode: (row.syncMode as SupplierSyncMode) || "incremental",
    cursor: row.cursor ? String(row.cursor) : undefined,
    page: row.page != null ? Number(row.page) : undefined,
    offset: row.offset != null ? Number(row.offset) : undefined,
    lastModified: row.lastModified ? String(row.lastModified) : undefined,
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  };
}

export function hydrateSyncCursorsFromPersistence(): void {
  const persistence = getSupplierPersistence();
  if (!persistence) return;
  const listAll = (persistence as { listAllCursors?: () => Record<string, unknown>[] }).listAllCursors;
  const rows = listAll ? listAll.call(persistence) : [];
  for (const cursor of rows) {
    const parsed = fromPersisted(cursor);
    cursorStore.set(cursorKey(parsed.supplierId, parsed.syncMode || "incremental"), parsed);
  }
}

export function getSyncCursor(
  supplierId: string,
  syncMode: SupplierSyncMode = "incremental"
): SupplierSyncCursor | undefined {
  const key = cursorKey(supplierId, syncMode);
  const cached = cursorStore.get(key);
  if (cached) return cached;
  const row = getSupplierPersistence()?.getCursor(supplierId, syncMode);
  if (row) {
    const cursor = fromPersisted(row);
    cursorStore.set(key, cursor);
    return cursor;
  }
  return undefined;
}

export function saveSyncCursor(
  supplierId: string,
  patch: Partial<Omit<SupplierSyncCursor, "supplierId" | "updatedAt">>,
  syncMode: SupplierSyncMode = "incremental"
): SupplierSyncCursor {
  const existing = getSyncCursor(supplierId, syncMode);
  const next: SupplierSyncCursor = {
    supplierId,
    syncMode,
    cursor: patch.cursor ?? existing?.cursor,
    page: patch.page ?? existing?.page,
    offset: patch.offset ?? existing?.offset,
    lastModified: patch.lastModified ?? existing?.lastModified,
    updatedAt: new Date().toISOString(),
  };
  cursorStore.set(cursorKey(supplierId, syncMode), next);
  getSupplierPersistence()?.saveCursor(next as unknown as Record<string, unknown>);
  return next;
}

export function clearSyncCursor(supplierId: string, syncMode: SupplierSyncMode = "incremental"): void {
  cursorStore.delete(cursorKey(supplierId, syncMode));
  getSupplierPersistence()?.clearCursor(supplierId, syncMode);
}

export function listSyncCursors(): SupplierSyncCursor[] {
  return [...cursorStore.values()];
}

export function getSyncCursorForAdmin(supplierId: string, syncMode: SupplierSyncMode = "incremental") {
  return getSupplierPersistence()?.getCursorForAdmin(supplierId, syncMode) ?? null;
}

/** Test-only reset */
export function resetSyncCursors(): void {
  cursorStore.clear();
}

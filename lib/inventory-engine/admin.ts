import { describeStockBuffer } from "./buffer";
import { getLastStockEvent } from "./events";
import { listStockRecords } from "./registry";
import type { InventoryEngineAdminRow } from "./types";

export function buildInventoryAdminRow(
  record: import("./types").SupplierStockRecord
): InventoryEngineAdminRow {
  const lastEvent = getLastStockEvent(record.productId, record.supplierId, record.supplierOfferId);
  return {
    productId: record.productId,
    supplierId: record.supplierId,
    supplierOfferId: record.supplierOfferId,
    supplierSku: record.supplierSku,
    supplierQuantity: record.quantity,
    saleableQuantity: record.saleableQuantity,
    reservedQuantity: record.reservedQuantity,
    stockBuffer: describeStockBuffer(record.stockBuffer),
    stockStatus: record.stockStatus,
    lastSuccessfulSync: record.lastSuccessfulSyncAt,
    isStale: record.isStale,
    marketAvailability: record.marketAvailability.map((m) => `${m.marketId}:${m.status}`).join(", "),
    channelAvailability: record.channelAvailability.map((c) => `${c.channel}:${c.status}`).join(", "),
    lastStockEvent: lastEvent?.type ?? "NONE",
  };
}

export function getInventoryAdminOverview(filter?: {
  productId?: string;
  supplierId?: string;
}): InventoryEngineAdminRow[] {
  return listStockRecords(filter).map(buildInventoryAdminRow);
}

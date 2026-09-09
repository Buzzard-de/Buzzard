import extensions from "@/data/global/inventory_engine_extensions.json";
import type {
  InventoryChannel,
  MissingStockPolicy,
  StalePolicy,
  StockBufferConfig,
  SupplierStockRecord,
} from "./types";

type Extensions = typeof extensions;
const config = extensions as Extensions;

const stockRegistry = new Map<string, SupplierStockRecord>();

export function stockRecordKey(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): string {
  return `${productId}:${supplierId}:${supplierOfferId}`;
}

export function getStockRecord(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): SupplierStockRecord | undefined {
  return stockRegistry.get(stockRecordKey(productId, supplierId, supplierOfferId));
}

export function upsertStockRecord(record: SupplierStockRecord): SupplierStockRecord {
  stockRegistry.set(stockRecordKey(record.productId, record.supplierId, record.supplierOfferId), record);
  return record;
}

export function listStockRecords(filter?: {
  productId?: string;
  supplierId?: string;
}): SupplierStockRecord[] {
  return [...stockRegistry.values()].filter((r) => {
    if (filter?.productId && r.productId !== filter.productId) return false;
    if (filter?.supplierId && r.supplierId !== filter.supplierId) return false;
    return true;
  });
}

export function clearStockRegistry(): void {
  stockRegistry.clear();
}

export function getDefaultStaleAfterMs(): number {
  return config.defaultStaleAfterMs;
}

export function getDefaultStalePolicy(): StalePolicy {
  return config.defaultStalePolicy as StalePolicy;
}

export function getStalePolicy(supplierId?: string, channel?: InventoryChannel): StalePolicy {
  const bySupplier = config.stalePolicies.bySupplier as Record<string, StalePolicy>;
  const byChannel = config.stalePolicies.byChannel as Record<string, StalePolicy>;
  if (channel && byChannel[channel]) return byChannel[channel];
  if (supplierId && bySupplier[supplierId]) return bySupplier[supplierId];
  return (config.stalePolicies.default as StalePolicy) ?? getDefaultStalePolicy();
}

export function getMissingStockPolicy(): MissingStockPolicy {
  return config.missingStockPolicy as MissingStockPolicy;
}

export function getLowStockThreshold(): number {
  return config.lowStockThreshold;
}

export function getStockBufferConfig(options?: {
  supplierId?: string;
  categoryId?: string;
  marketId?: string;
  channel?: InventoryChannel;
}): StockBufferConfig {
  const defaults = config.defaultStockBuffer as StockBufferConfig;
  const bySupplier = config.stockBuffers.bySupplier as Record<string, StockBufferConfig>;
  const byCategory = config.stockBuffers.byCategory as Record<string, StockBufferConfig>;
  const byMarket = config.stockBuffers.byMarket as Record<string, StockBufferConfig>;
  const byChannel = config.stockBuffers.byChannel as Record<string, StockBufferConfig>;

  return (
    (options?.channel ? byChannel[options.channel] : undefined) ??
    (options?.marketId ? byMarket[options.marketId] : undefined) ??
    (options?.categoryId ? byCategory[options.categoryId] : undefined) ??
    (options?.supplierId ? bySupplier[options.supplierId] : undefined) ??
    defaults
  );
}

export function getReservationTtlMs(): number {
  return config.reservationDefaults.ttlMs;
}

export function getMaxReservationQuantity(): number {
  return config.reservationDefaults.maxQuantityPerReservation;
}

export function getSupportedChannels(): InventoryChannel[] {
  return config.supportedChannels as InventoryChannel[];
}

export function resolveFixtureProductId(supplierSku: string): string | undefined {
  const mapping = config.fixtureProductMapping as Record<string, string>;
  return mapping[supplierSku];
}

export function getFixtureProductMapping(): Record<string, string> {
  return { ...(config.fixtureProductMapping as Record<string, string>) };
}

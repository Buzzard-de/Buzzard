import { createConnector } from "./connectors/factory";
import { applyFieldMapping, validateMappedRecord } from "./fieldMapping";
import { getSupplierOrThrow } from "./registry";
import type { ConnectorConfig, IntegrationType } from "./types";

export interface DryRunTestSyncResult {
  ok: boolean;
  dryRun: true;
  supplierId: string;
  productsFound: number;
  valid: number;
  invalid: number;
  duplicates: number;
  stockRecords: number;
  priceRecords: number;
  warnings: string[];
  errors: Array<{ code: string; message: string; record?: string }>;
  completedAt: string;
}

export async function runSupplierDryRunTestSync(
  supplierId: string,
  options: { integrationType?: IntegrationType; connectorConfig?: ConnectorConfig } = {}
): Promise<DryRunTestSyncResult> {
  const supplier = getSupplierOrThrow(supplierId);
  const integrationType = options.integrationType ?? supplier.integrationTypes[0] ?? "api";
  const connector = createConnector(supplier, integrationType, options.connectorConfig || {});

  const result: DryRunTestSyncResult = {
    ok: true,
    dryRun: true,
    supplierId,
    productsFound: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0,
    stockRecords: 0,
    priceRecords: 0,
    warnings: [],
    errors: [],
    completedAt: new Date().toISOString(),
  };

  await connector.connect();

  const seenSkus = new Set<string>();
  const productFetch = await connector.fetchProducts({ limit: 1000 });
  if (!productFetch.ok) {
    result.ok = false;
    result.errors.push({
      code: productFetch.error || "FETCH_FAILED",
      message: productFetch.error || "Product fetch failed",
    });
    return result;
  }

  result.productsFound = productFetch.records.length;
  for (const raw of productFetch.records) {
    const mapped = applyFieldMapping(raw, supplier.fieldMapping);
    const sku = String(mapped.supplierSku || mapped.supplier_sku || "");
    const fieldErrors = validateMappedRecord(mapped);
    if (fieldErrors.length) {
      result.invalid++;
      result.errors.push({ code: fieldErrors[0], message: fieldErrors[0], record: sku || "unknown" });
      continue;
    }
    if (sku) {
      if (seenSkus.has(sku)) {
        result.duplicates++;
        result.warnings.push(`Duplicate SKU in feed: ${sku}`);
        continue;
      }
      seenSkus.add(sku);
    }
    result.valid++;
  }

  if (supplier.capabilities.stockFeed) {
    const stockFetch = await connector.fetchStock();
    if (stockFetch.ok) result.stockRecords = stockFetch.records.length;
    else result.warnings.push(stockFetch.error || "Stock fetch failed");
  }

  if (supplier.capabilities.priceFeed) {
    const priceFetch = await connector.fetchPrices();
    if (priceFetch.ok) result.priceRecords = priceFetch.records.length;
    else result.warnings.push(priceFetch.error || "Price fetch failed");
  }

  result.ok = result.errors.length === 0;
  result.completedAt = new Date().toISOString();
  return result;
}

import { createConnector } from "./connectors/factory";
import { applyFieldMapping, validateMappedRecord } from "./fieldMapping";
import { getSupplierOrThrow } from "./registry";
import { normalizeB2bSandboxRecord } from "./connectors/b2b-sandbox/mapping";
import { buildDataQualityReport, isAutomotiveSupplier } from "./dataQuality";
import type { ConnectorConfig, IntegrationType } from "./types";
import type { SupplierDataQualityReport } from "./dataQuality";

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
  dataQuality?: SupplierDataQualityReport;
  source: "mock" | "live" | "fixture";
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
    source: integrationType === "b2b-sandbox" ? "live" : "fixture",
    completedAt: new Date().toISOString(),
  };

  await connector.connect();

  const seenSkus = new Set<string>();
  const normalizedRecords: Record<string, unknown>[] = [];
  const productFetch = await connector.fetchProducts({ limit: 1000 });

  if (!productFetch.ok) {
    result.ok = false;
    result.errors.push({
      code: productFetch.error || "FETCH_FAILED",
      message: productFetch.error || "Product fetch failed",
    });
    if (productFetch.error === "NETWORK_DISABLED") {
      result.source = "mock";
      result.warnings.push("Live network disabled — dry-run cannot fetch real supplier feed");
    }
    return result;
  }

  if (productFetch.dryRun) result.source = "fixture";

  result.productsFound = productFetch.records.length;
  for (const raw of productFetch.records) {
    const mapped =
      integrationType === "b2b-sandbox" && supplier.connectorProfile
        ? normalizeB2bSandboxRecord(raw, supplier.connectorProfile)
        : applyFieldMapping(raw, supplier.fieldMapping);

    normalizedRecords.push(mapped);
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

  result.dataQuality = buildDataQualityReport(normalizedRecords, {
    automotive: isAutomotiveSupplier(supplier.connectorProfile),
  });

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

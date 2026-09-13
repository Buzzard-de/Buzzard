import type { LiveSupplierProfile } from "./liveSupplier/types";

export interface SupplierDataQualityReport {
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  duplicates: number;
  missingEan: number;
  missingMpn: number;
  missingBrand: number;
  missingCategory: number;
  missingPrice: number;
  missingStock: number;
  missingImages: number;
  missingFitment: number;
  missingOem: number;
  missingDimensions: number;
  reviewRequiredCategories: number;
  warnings: string[];
}

export function buildDataQualityReport(
  records: Record<string, unknown>[],
  options: { automotive?: boolean } = {}
): SupplierDataQualityReport {
  const report: SupplierDataQualityReport = {
    totalProducts: records.length,
    validProducts: 0,
    invalidProducts: 0,
    duplicates: 0,
    missingEan: 0,
    missingMpn: 0,
    missingBrand: 0,
    missingCategory: 0,
    missingPrice: 0,
    missingStock: 0,
    missingImages: 0,
    missingFitment: 0,
    missingOem: 0,
    missingDimensions: 0,
    reviewRequiredCategories: 0,
    warnings: [],
  };

  const seenSkus = new Set<string>();

  for (const record of records) {
    const sku = String(record.supplierSku || record.supplier_sku || "");
    if (sku && seenSkus.has(sku)) {
      report.duplicates++;
      continue;
    }
    if (sku) seenSkus.add(sku);

    let valid = Boolean(sku);
    if (!record.ean && !record.gtin) report.missingEan++;
    if (!record.mpn) report.missingMpn++;
    if (!record.brand) report.missingBrand++;
    if (!record.buzzardCategory || record.buzzardCategory === "REVIEW_REQUIRED") {
      report.missingCategory++;
      if (record.buzzardCategory === "REVIEW_REQUIRED") report.reviewRequiredCategories++;
    }
    const price = record.supplierPrice ?? (record.supplier_price as { amount?: number })?.amount;
    if (price == null) report.missingPrice++;
    if (record.stock == null && record.stock_qty == null) report.missingStock++;
    const images = record.images;
    if (!images || (Array.isArray(images) && images.length === 0)) report.missingImages++;

    if (options.automotive) {
      const fitment = record.vehicleFitment || record.vehicle_compatibility;
      if (!fitment || (Array.isArray(fitment) && fitment.length === 0)) report.missingFitment++;
      if (!record.oemNumbers && !record.oem) report.missingOem++;
      if (!record.weight && !record.dimensions) report.missingDimensions++;
    }

    if (!sku) valid = false;
    if (valid) report.validProducts++;
    else report.invalidProducts++;
  }

  return report;
}

export function isAutomotiveSupplier(profile?: LiveSupplierProfile): boolean {
  return profile?.supportedMarkets.includes("DE") === true;
}

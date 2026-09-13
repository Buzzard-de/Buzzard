import type { LiveSupplierProfile } from "./liveSupplier/types";

export interface SupplierDataQualityReport {
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  duplicates: number;
  missingEan: number;
  missingGtin: number;
  missingMpn: number;
  missingSku: number;
  missingBrand: number;
  missingCategory: number;
  missingPrice: number;
  missingStock: number;
  missingImages: number;
  missingFitment: number;
  missingOem: number;
  missingTecDoc: number;
  missingDimensions: number;
  reviewRequiredCategories: number;
  eanCoverage: number | "UNKNOWN";
  gtinCoverage: number | "UNKNOWN";
  mpnCoverage: number | "UNKNOWN";
  skuCoverage: number | "UNKNOWN";
  brandCoverage: number | "UNKNOWN";
  categoryCoverage: number | "UNKNOWN";
  imageCoverage: number | "UNKNOWN";
  priceCoverage: number | "UNKNOWN";
  stockCoverage: number | "UNKNOWN";
  fitmentCoverage: number | "UNKNOWN";
  oemCoverage: number | "UNKNOWN";
  tecDocCoverage: number | "UNKNOWN";
  dimensionCoverage: number | "UNKNOWN";
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
    missingGtin: 0,
    missingMpn: 0,
    missingSku: 0,
    missingBrand: 0,
    missingCategory: 0,
    missingPrice: 0,
    missingStock: 0,
    missingImages: 0,
    missingFitment: 0,
    missingOem: 0,
    missingTecDoc: 0,
    missingDimensions: 0,
    reviewRequiredCategories: 0,
    eanCoverage: "UNKNOWN",
    gtinCoverage: "UNKNOWN",
    mpnCoverage: "UNKNOWN",
    skuCoverage: "UNKNOWN",
    brandCoverage: "UNKNOWN",
    categoryCoverage: "UNKNOWN",
    imageCoverage: "UNKNOWN",
    priceCoverage: "UNKNOWN",
    stockCoverage: "UNKNOWN",
    fitmentCoverage: "UNKNOWN",
    oemCoverage: "UNKNOWN",
    tecDocCoverage: "UNKNOWN",
    dimensionCoverage: "UNKNOWN",
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
    if (!sku) report.missingSku++;
    if (!record.ean) report.missingEan++;
    if (!record.gtin) report.missingGtin++;
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
      if (!record.tecdocId && !record.tecDoc) report.missingTecDoc++;
      if (!record.weight && !record.dimensions && !record.packageWeight) report.missingDimensions++;
    }

    if (!sku) valid = false;
    if (valid) report.validProducts++;
    else report.invalidProducts++;
  }

  if (records.length > 0) {
    const total = records.length;
    const pct = (missing: number) => Math.round(((total - missing) / total) * 1000) / 10;
    report.eanCoverage = pct(report.missingEan);
    report.gtinCoverage = pct(report.missingGtin);
    report.mpnCoverage = pct(report.missingMpn);
    report.skuCoverage = pct(report.missingSku);
    report.brandCoverage = pct(report.missingBrand);
    report.categoryCoverage = pct(report.missingCategory);
    report.imageCoverage = pct(report.missingImages);
    report.priceCoverage = pct(report.missingPrice);
    report.stockCoverage = pct(report.missingStock);
    if (options.automotive) {
      report.fitmentCoverage = pct(report.missingFitment);
      report.oemCoverage = pct(report.missingOem);
      report.tecDocCoverage = pct(report.missingTecDoc);
      report.dimensionCoverage = pct(report.missingDimensions);
    }
  }

  return report;
}

export function isAutomotiveSupplier(profile?: LiveSupplierProfile): boolean {
  return profile?.supportedMarkets.includes("DE") === true;
}

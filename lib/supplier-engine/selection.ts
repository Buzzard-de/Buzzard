import { selectBestSupplier as productSelectBestSupplier } from "@/lib/product-engine";
import type { ProductEngineProduct } from "@/lib/product-engine/types";
import { computeSupplierReliabilityScore } from "./reliability";
import { createConnector } from "./connectors/factory";
import { getSupplier } from "./registry";

/** Enrich Product Engine supplier selection with Supplier Engine data. */
export async function selectBestSupplierForMarket(
  product: ProductEngineProduct,
  options?: { countryCode?: string; supplierRegions?: string[] }
) {
  const base = productSelectBestSupplier(product, options);

  if (!base) return null;

  const supplier = getSupplier(base.offer.supplierId);
  const reliability = computeSupplierReliabilityScore(base.offer.supplierId);
  let connectorHealth = 0.5;

  if (supplier) {
    try {
      const connector = createConnector(supplier, supplier.integrationTypes[0]);
      const health = await connector.healthCheck();
      connectorHealth = health.status === "HEALTHY" ? 1 : health.status === "DEGRADED" ? 0.6 : 0.2;
    } catch {
      connectorHealth = 0;
    }
  }

  const enrichedScore =
    base.score * 0.7 +
    reliability.score * 0.15 +
    connectorHealth * 0.1 +
    (supplier?.capabilities.dropshipping ? 0.05 : 0);

  return {
    ...base,
    score: enrichedScore,
    reasons: [
      ...base.reasons,
      `reliability:${reliability.score.toFixed(2)}`,
      `connectorHealth:${connectorHealth.toFixed(2)}`,
      supplier?.capabilities.dropshipping ? "dropshipping:yes" : "dropshipping:no",
    ],
  };
}

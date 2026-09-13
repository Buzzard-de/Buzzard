import { selectBestSupplier as productSelectBestSupplier } from "@/lib/product-engine";
import type { ProductEngineProduct } from "@/lib/product-engine/types";
import { computeSupplierReliabilityScore } from "./reliability";
import { createConnector } from "./connectors/factory";
import { getSupplier } from "./registry";
import { getSupplierRuntimeState } from "./state";
import { resolveShippingCost } from "@/lib/pricing-engine/shipping";

function isMarketEligible(supplierId: string, marketId?: string): boolean {
  if (!marketId) return true;
  const supplier = getSupplier(supplierId);
  if (!supplier?.supportedMarkets?.length) return true;
  return supplier.supportedMarkets.includes(marketId);
}

function computeLandedCostScore(
  product: ProductEngineProduct,
  offer: { supplierPrice: number; supplierId: string },
  marketId?: string
): { score: number; reason: string } {
  if (!marketId) return { score: 0.5, reason: "landedCost:unknown" };
  const shipping = resolveShippingCost({
    productId: product.productId,
    marketId,
    supplierId: offer.supplierId,
    targetCurrency: product.pricing.currency,
  });
  const landed = offer.supplierPrice + shipping.shippingCost;
  const maxLanded = Math.max(offer.supplierPrice * 1.5, landed, 1);
  const score = Math.max(0, 1 - landed / maxLanded);
  return { score, reason: `landedCost:${landed.toFixed(2)}` };
}

/** Sync deterministic selection for Order Engine — no live connector calls. */
export function selectBestSupplierForOrder(
  product: ProductEngineProduct,
  options?: { countryCode?: string; supplierRegions?: string[] }
) {
  const marketId = options?.countryCode;
  const offers = product.supplierOffers.filter((o) => {
    if (o.stock <= 0) return false;
    return isMarketEligible(o.supplierId, marketId);
  });

  if (!offers.length) return null;

  const candidateProduct = { ...product, supplierOffers: offers };
  const base = productSelectBestSupplier(candidateProduct, options);
  if (!base) return null;

  const supplier = getSupplier(base.offer.supplierId);
  const reliability = computeSupplierReliabilityScore(base.offer.supplierId);
  const runtime = getSupplierRuntimeState(base.offer.supplierId);
  const connectorHealth =
    runtime.healthStatus === "HEALTHY" ? 1 : runtime.healthStatus === "DEGRADED" ? 0.6 : 0.3;
  const landed = computeLandedCostScore(product, base.offer, marketId);

  let enrichedScore =
    base.score * 0.55 +
    reliability.score * 0.15 +
    connectorHealth * 0.1 +
    landed.score * 0.15;

  const reasons = [
    ...base.reasons,
    `reliability:${reliability.score.toFixed(2)}`,
    `connectorHealth:${connectorHealth.toFixed(2)}`,
    landed.reason,
  ];

  if (supplier?.capabilities.dropshipping) {
    enrichedScore += 0.03;
    reasons.push("dropshipping:yes");
  } else {
    reasons.push("dropshipping:no");
  }
  if (supplier?.capabilities.whiteLabel) {
    enrichedScore += 0.02;
    reasons.push("whiteLabel:yes");
  }

  return {
    ...base,
    score: enrichedScore,
    reasons,
  };
}

/** Enrich Product Engine supplier selection with Supplier Engine data. */
export async function selectBestSupplierForMarket(
  product: ProductEngineProduct,
  options?: { countryCode?: string; supplierRegions?: string[] }
) {
  const base = selectBestSupplierForOrder(product, options);
  if (!base) return null;

  const supplier = getSupplier(base.offer.supplierId);
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

  const enrichedScore = base.score * 0.9 + connectorHealth * 0.1;

  return {
    ...base,
    score: enrichedScore,
    reasons: [...base.reasons, `liveHealth:${connectorHealth.toFixed(2)}`],
  };
}

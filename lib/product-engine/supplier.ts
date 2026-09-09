import type {
  ProductEngineProduct,
  SupplierOffer,
  SupplierSelectionCriteria,
  SupplierSelectionResult,
} from "./types";
import { emitProductEvent } from "./events";
import { resolveStatusFromStock } from "./status";

export function createSupplierOffer(
  partial: Omit<SupplierOffer, "lastUpdated"> & { lastUpdated?: string }
): SupplierOffer {
  return {
    ...partial,
    lastUpdated: partial.lastUpdated || new Date().toISOString(),
    reliabilityScore: partial.reliabilityScore ?? 0.5,
  };
}

export function updateSupplierOffer(
  product: ProductEngineProduct,
  supplierId: string,
  patch: Partial<Pick<SupplierOffer, "supplierPrice" | "currency" | "stock" | "leadTimeDays">>
): ProductEngineProduct {
  const offers = product.supplierOffers.map((offer) => {
    if (offer.supplierId !== supplierId) return offer;
    const updated: SupplierOffer = {
      ...offer,
      ...patch,
      lastUpdated: new Date().toISOString(),
    };
    if (patch.supplierPrice != null) {
      emitProductEvent("SUPPLIER_PRICE_UPDATED", product.productId, {
        supplierId,
        price: patch.supplierPrice,
      });
    }
    if (patch.stock != null) {
      emitProductEvent("SUPPLIER_STOCK_UPDATED", product.productId, {
        supplierId,
        stock: patch.stock,
      });
    }
    emitProductEvent("SUPPLIER_OFFER_UPDATED", product.productId, { supplierId });
    return updated;
  });

  const totalStock = offers.reduce((sum, o) => sum + (o.stock || 0), 0);
  const best = selectBestSupplier({ ...product, supplierOffers: offers });
  const supplierCost = best?.offer.supplierPrice ?? product.pricing.supplierCost;

  return {
    ...product,
    supplierOffers: offers,
    stock: {
      quantity: totalStock,
      availability: totalStock <= 0 ? "OUT_OF_STOCK" : totalStock <= 5 ? "LOW_STOCK" : "IN_STOCK",
      lastUpdated: new Date().toISOString(),
    },
    status: resolveStatusFromStock(product.status, totalStock, {
      manuallyDiscontinued: product.status === "DISCONTINUED",
    }),
    pricing: {
      ...product.pricing,
      supplierCost,
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Deterministic supplier scoring — no AI. */
export function selectBestSupplier(
  product: ProductEngineProduct,
  market?: { countryCode?: string; supplierRegions?: string[] },
  criteria: SupplierSelectionCriteria = {}
): SupplierSelectionResult | null {
  const offers = product.supplierOffers.filter((o) => o.stock > 0);
  if (!offers.length) return null;

  const weights = {
    stock: criteria.stockWeight ?? 0.25,
    price: criteria.priceWeight ?? 0.3,
    leadTime: criteria.leadTimeWeight ?? 0.15,
    reliability: criteria.reliabilityWeight ?? 0.2,
    margin: criteria.marginWeight ?? 0.1,
  };

  const maxStock = Math.max(...offers.map((o) => o.stock), 1);
  const minPrice = Math.min(...offers.map((o) => o.supplierPrice).filter((p) => p > 0), Infinity);
  const preferredRegions = market?.supplierRegions ?? [];

  let best: SupplierSelectionResult | null = null;

  for (const offer of offers) {
    const reasons: string[] = [];
    let score = 0;

    const stockScore = offer.stock / maxStock;
    score += stockScore * weights.stock;
    reasons.push(`stock:${stockScore.toFixed(2)}`);

    const priceScore = offer.supplierPrice > 0 && minPrice < Infinity ? minPrice / offer.supplierPrice : 0.5;
    score += priceScore * weights.price;
    reasons.push(`price:${priceScore.toFixed(2)}`);

    const leadDays = offer.leadTimeDays ?? 7;
    const leadScore = Math.max(0, 1 - leadDays / 30);
    score += leadScore * weights.leadTime;
    reasons.push(`leadTime:${leadScore.toFixed(2)}`);

    const reliabilityScore = offer.reliabilityScore ?? 0.5;
    score += reliabilityScore * weights.reliability;
    reasons.push(`reliability:${reliabilityScore.toFixed(2)}`);

    const margin = product.pricing.customerPrice > 0
      ? (product.pricing.customerPrice - offer.supplierPrice) / product.pricing.customerPrice
      : 0;
    const marginScore = Math.max(0, Math.min(1, margin));
    score += marginScore * weights.margin;
    reasons.push(`margin:${marginScore.toFixed(2)}`);

    if (preferredRegions.length && offer.shippingRegions?.some((r) => preferredRegions.includes(r))) {
      score += 0.1;
      reasons.push("region:preferred");
    }

    if (!best || score > best.score) {
      best = { offer, score, reasons };
    }
  }

  return best;
}

export function addSupplierOffer(
  product: ProductEngineProduct,
  offer: SupplierOffer
): ProductEngineProduct {
  const existing = product.supplierOffers.findIndex(
    (o) => o.supplierId === offer.supplierId && o.supplierSku === offer.supplierSku
  );
  const offers =
    existing >= 0
      ? product.supplierOffers.map((o, i) => (i === existing ? offer : o))
      : [...product.supplierOffers, offer];
  return { ...product, supplierOffers: offers, updatedAt: new Date().toISOString() };
}

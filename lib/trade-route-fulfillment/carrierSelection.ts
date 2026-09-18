import { validateParcel } from "@/lib/carrier-production/adapter";
import type { CarrierProfileId, CarrierSelectionResult, TradeRouteType } from "./types";

export interface CarrierProfile {
  carrierId: CarrierProfileId;
  adapterId: "dhl" | "dpd" | "gls";
  serviceLevel: string;
  maxWeightKg: number;
  maxLengthCm: number;
  internationalSupport: boolean;
  customsSupport: boolean;
  trackingSupport: boolean;
  returnsSupport: boolean;
  dangerousGoods: boolean;
  oversized: boolean;
  supportedOrigins: string[] | "*";
  supportedDestinations: string[] | "*";
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  baseCost: number;
}

export const CARRIER_PROFILES: CarrierProfile[] = [
  {
    carrierId: "DHL",
    adapterId: "dhl",
    serviceLevel: "standard",
    maxWeightKg: 31.5,
    maxLengthCm: 120,
    internationalSupport: true,
    customsSupport: true,
    trackingSupport: true,
    returnsSupport: true,
    dangerousGoods: false,
    oversized: false,
    supportedOrigins: "*",
    supportedDestinations: "*",
    deliveryDaysMin: 2,
    deliveryDaysMax: 5,
    baseCost: 6.99,
  },
  {
    carrierId: "DPD",
    adapterId: "dpd",
    serviceLevel: "standard",
    maxWeightKg: 31.5,
    maxLengthCm: 175,
    internationalSupport: true,
    customsSupport: true,
    trackingSupport: true,
    returnsSupport: true,
    dangerousGoods: false,
    oversized: false,
    supportedOrigins: "*",
    supportedDestinations: "*",
    deliveryDaysMin: 2,
    deliveryDaysMax: 6,
    baseCost: 5.99,
  },
  {
    carrierId: "GLS",
    adapterId: "gls",
    serviceLevel: "standard",
    maxWeightKg: 40,
    maxLengthCm: 200,
    internationalSupport: true,
    customsSupport: false,
    trackingSupport: true,
    returnsSupport: true,
    dangerousGoods: false,
    oversized: false,
    supportedOrigins: "*",
    supportedDestinations: "*",
    deliveryDaysMin: 2,
    deliveryDaysMax: 7,
    baseCost: 5.49,
  },
  {
    carrierId: "UPS",
    adapterId: "dhl",
    serviceLevel: "express",
    maxWeightKg: 70,
    maxLengthCm: 274,
    internationalSupport: true,
    customsSupport: true,
    trackingSupport: true,
    returnsSupport: false,
    dangerousGoods: false,
    oversized: true,
    supportedOrigins: "*",
    supportedDestinations: "*",
    deliveryDaysMin: 1,
    deliveryDaysMax: 3,
    baseCost: 14.99,
  },
  {
    carrierId: "DHL_EXPRESS",
    adapterId: "dhl",
    serviceLevel: "express",
    maxWeightKg: 70,
    maxLengthCm: 120,
    internationalSupport: true,
    customsSupport: true,
    trackingSupport: true,
    returnsSupport: false,
    dangerousGoods: false,
    oversized: false,
    supportedOrigins: "*",
    supportedDestinations: "*",
    deliveryDaysMin: 1,
    deliveryDaysMax: 2,
    baseCost: 19.99,
  },
];

function supportsRoute(profile: CarrierProfile, origin: string, destination: string): boolean {
  const originOk =
    profile.supportedOrigins === "*" || profile.supportedOrigins.includes(origin);
  const destOk =
    profile.supportedDestinations === "*" || profile.supportedDestinations.includes(destination);
  return originOk && destOk;
}

function requiresCustomsRoute(tradeRoute: TradeRouteType): boolean {
  return (
    tradeRoute === "EU_TO_NON_EU" ||
    tradeRoute === "NON_EU_TO_EU" ||
    tradeRoute === "NON_EU_TO_NON_EU"
  );
}

/**
 * Select carrier from existing carrier-production validation + profile registry.
 * Never creates real labels or shipments.
 */
export function selectCarrier(input: {
  originCountry: string;
  destinationCountry: string;
  postalCode?: string;
  tradeRoute: TradeRouteType;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
  serviceLevel?: string;
  productType?: string;
  customsRequired?: boolean;
  dangerousGoods?: boolean;
  oversized?: boolean;
  insuranceRequired?: boolean;
  shippingCost?: number;
  shipmentId: string;
  idempotencyKey: string;
}): CarrierSelectionResult {
  const evaluated: string[] = [];
  const needsCustoms = input.customsRequired ?? requiresCustomsRoute(input.tradeRoute);
  const preferredLevel = input.serviceLevel ?? "standard";
  const isOversized =
    input.oversized === true ||
    input.dimensionsCm.length > 120 ||
    input.weightKg > 31.5;

  const candidates = CARRIER_PROFILES.filter((p) => {
    evaluated.push(p.carrierId);
    if (preferredLevel === "express" && p.serviceLevel !== "express") return false;
    if (preferredLevel === "standard" && p.serviceLevel === "express") return false;
    if (!supportsRoute(p, input.originCountry, input.destinationCountry)) return false;
    if (needsCustoms && !p.customsSupport) return false;
    if (input.dangerousGoods === true && !p.dangerousGoods) return false;
    if (isOversized && !p.oversized) return false;
    if (input.weightKg > p.maxWeightKg) return false;
    if (input.dimensionsCm.length > p.maxLengthCm) return false;
    return true;
  });

  for (const profile of candidates) {
    const validation = validateParcel({
      shipmentId: input.shipmentId,
      carrierId: profile.adapterId,
      country: input.destinationCountry,
      weightKg: input.weightKg,
      dimensionsCm: input.dimensionsCm,
      addressRef: "order-shipping-address",
      idempotencyKey: input.idempotencyKey,
    });
    if (!validation.ok) continue;

    const deliveryDays = profile.deliveryDaysMax;
    const estimatedDelivery = new Date(Date.now() + deliveryDays * 86400000).toISOString();

    return {
      ok: true,
      carrierId: profile.carrierId,
      serviceLevel: profile.serviceLevel,
      shippingCost: input.shippingCost ?? profile.baseCost,
      estimatedDelivery,
      trackingSupported: profile.trackingSupport,
      evaluatedCarriers: evaluated,
    };
  }

  return {
    ok: false,
    errorCode: "NO_CARRIER",
    errorMessage: "SHIPPING_HOLD",
    evaluatedCarriers: evaluated,
  };
}
